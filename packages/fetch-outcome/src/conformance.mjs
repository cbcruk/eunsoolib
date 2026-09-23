/**
 * Conformance gate.
 *
 * For each wire condition, assert the `FetchOutcome` that undici's fetch
 * *actually* produces today — not what the taxonomy wishes for. This is the
 * honest baseline: the four cases the taxonomy cannot distinguish are encoded as
 * expected `indeterminate` / silently-truncated `ok` outcomes rather than hidden
 * behind a report that always exits 0. If undici improves (recovers more) or
 * regresses (changes the error-message format the message-scrape depends on),
 * this test breaks. That is the point.
 *
 * Run: pnpm --filter @cbcruk/fetch-outcome conformance (dist를 빌드한 뒤 검사한다)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent, fetch as undiciFetch } from 'undici'
import { createServer, ROUTES } from './conformance-server.mjs'
import { safeFetch, safeText } from '../dist/index.js'

const dir = path.dirname(fileURLToPath(import.meta.url))
const ca = fs.readFileSync(path.join(dir, 'cert.pem'))
const PORT = 8443
const TIMEOUT_MS = 3000

/**
 * The observable truth through undici 8.10.2 / Node 24, keyed by route. `stage`
 * is where the outcome is decided: `head` (safeFetch rejected), `body`
 * (safeText), or `hang` (the promise never settled and a timeout stood in).
 *
 * Two attestation flags are checked, not just the code:
 *  - `attested`  the outcome's retry verdict rests on a guarantee the server made
 *  - `peerCode`  the evidence carries a code the *peer* actually sent
 * They differ: a PROTOCOL_ERROR is genuinely from the peer (`peerCode`) but
 * grants no retry permission (`attested: false`). A drift in either matters
 * more than a drift in the code string.
 */
const EXPECT = {
  '/reset/refused': {
    stage: 'head',
    kind: 'failed',
    code: 'ERR_HTTP_REQUEST_REJECTED',
    retry: 'safe',
    attested: true,
    peerCode: true,
  },
  '/reset/cancel': {
    stage: 'head',
    kind: 'failed',
    code: 'ERR_HTTP_STREAM_RESET',
    retry: 'unknown',
    attested: false,
    peerCode: false,
    note: 'undici >= 8.10 settles instead of hanging (8.7 did not), but drops the numeric code',
  },
  '/reset/internal': {
    stage: 'head',
    kind: 'failed',
    code: 'ERR_HTTP_INTERNAL_ERROR',
    retry: 'unsafe',
    attested: true,
    peerCode: true,
  },
  '/reset/protocol': {
    stage: 'head',
    kind: 'failed',
    code: 'ERR_HTTP_PROTOCOL_ERROR',
    retry: 'unknown',
    // The peer sent PROTOCOL_ERROR, but it says nothing about processing.
    attested: false,
    peerCode: true,
  },
  '/reset/enhance': {
    stage: 'head',
    kind: 'failed',
    code: 'ERR_HTTP_STREAM_RESET',
    retry: 'unknown',
    attested: false,
    // ENHANCE_YOUR_CALM is recovered from the peer, then collapsed into the
    // STREAM_RESET catch-all on purpose rather than leaking protocol detail.
    peerCode: true,
  },
  '/mid/cancel': {
    stage: 'body',
    kind: 'ok',
    note: 'silent truncation: no content-length, undici resolves the reset as complete',
  },
  '/mid/internal': { stage: 'body', kind: 'ok', note: 'silent truncation' },
  '/mid/cancel-with-length': {
    stage: 'body',
    kind: 'failed',
    code: 'ERR_HTTP_PROTOCOL_ERROR',
    retry: 'unknown',
    attested: false,
    peerCode: true,
    // undici 8.11 changes this one: the reset is reported as a content-length
    // mismatch instead, which detects the truncation but loses the peer code.
    // normalize.ts handles both shapes; this baseline pins the version the
    // package is developed against.
  },
  '/ok': { stage: 'body', kind: 'ok' },
}

const server = createServer()
await new Promise((r) => server.listen(PORT, r))

// One Agent per probe. A hung stream from a previous probe otherwise blocks the
// whole h2 session and every later result becomes a cascade artifact.
async function probe(route) {
  const method = 'POST'
  const agent = new Agent({ allowH2: true, connect: { ca } })
  const raw = (u, i) => undiciFetch(u, { ...i, dispatcher: agent })

  let timer
  const timeout = new Promise((res) => {
    timer = setTimeout(
      () =>
        res({
          stage: 'hang',
          outcome: { kind: 'indeterminate', retry: 'unknown' },
        }),
      TIMEOUT_MS,
    )
  })
  const work = (async () => {
    const head = await safeFetch(
      `https://localhost:${PORT}${route}`,
      { method, body: 'x', duplex: 'half' },
      { fetch: raw, redactCrossOrigin: false },
    )
    if (head.kind !== 'ok') return { stage: 'head', outcome: head }
    // Headers arrived; a reset can still land on the body stream.
    const body = await safeText(head.value, { method })
    return {
      stage: 'body',
      outcome: body,
      value: body.kind === 'ok' ? body.value : undefined,
    }
  })()

  const r = await Promise.race([work, timeout])
  clearTimeout(timer)
  agent.close().catch(() => {})
  return r
}

const check = (exp, got) => {
  const o = got.outcome
  if (got.stage !== exp.stage) return false
  if (o.kind !== exp.kind) return false
  if (exp.code && o.code !== exp.code) return false
  if (exp.retry && o.retry !== exp.retry) return false
  if (exp.attested !== undefined && o.attested !== exp.attested) return false
  if (
    exp.peerCode !== undefined &&
    (o.evidence?.attested ?? false) !== exp.peerCode
  )
    return false
  return true
}

const describe = (got) => {
  const o = got.outcome
  if (got.stage === 'hang') return 'indeterminate (never settled)'
  if (o.kind === 'ok') return `ok ${JSON.stringify(got.value)}`
  if (o.kind === 'failed') return `failed ${o.code} / retry:${o.retry}`
  return `indeterminate (${o.reason ?? '?'})`
}

const rows = []
for (const route of Object.keys(ROUTES)) {
  const exp = EXPECT[route]
  const got = await probe(route)
  rows.push({ route, exp, got, ok: check(exp, got) })
}

const pad = (s, n) => String(s).padEnd(n)
console.log(
  '\n' + pad('route', 26) + pad('expected outcome', 34) + 'observed outcome',
)
console.log('-'.repeat(96))
for (const { route, exp, got, ok } of rows) {
  const expStr = `${exp.stage}: ${exp.kind}${exp.code ? ` ${exp.code}` : ''}`
  console.log(
    (ok ? '  ' : '! ') + pad(route, 24) + pad(expStr, 34) + describe(got),
  )
}

const failures = rows.filter((r) => !r.ok)
const coded = rows.filter((r) => r.exp.kind === 'failed')
const fromPeer = coded.filter((r) => r.exp.peerCode)
console.log(
  `\n${coded.length}/${rows.length} conditions yield a coded failure; ` +
    `${fromPeer.length} of those carry a code the peer actually sent.`,
)
console.log('The rest are honest outcomes, not silent gaps:')
for (const { route, exp } of rows.filter((r) => !r.exp.peerCode)) {
  console.log(
    `  ${pad(route, 24)} ${exp.stage}:${exp.kind}${exp.note ? ` — ${exp.note}` : ''}`,
  )
}

server.close()

if (failures.length) {
  console.log(`\nFAIL: ${failures.length} route(s) drifted from the baseline:`)
  for (const f of failures) {
    console.log(
      `  ${f.route}: expected ${f.exp.stage}:${f.exp.kind}, got ${describe(f.got)}`,
    )
  }
  process.exit(1)
}
console.log('\nPASS: every route matched the observable baseline.')
process.exit(0)
