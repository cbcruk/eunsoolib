import {
  HTTP_ERROR_CODES,
  type HttpErrorCode,
  type HttpErrorInfo,
} from './codes'
import {
  fromH2,
  parseNghttp2Message,
  ATTESTED_CODE_MAP,
  TRANSPORT_CODE_MAP,
  UNDICI_LENGTH_MISMATCH,
  UNDICI_STREAM_CLOSED,
  isTlsCode,
} from './mapping'

const C = HTTP_ERROR_CODES

const ALL_CODES: ReadonlySet<string> = new Set(Object.values(HTTP_ERROR_CODES))

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/**
 * Flatten an error into every node reachable via `cause` and `AggregateError.errors`.
 * undici throws AggregateError when every address in a happy-eyeballs fan-out fails,
 * so a plain cause-chain walk misses those.
 */
function* frames(
  err: unknown,
  seen = new Set<unknown>(),
  depth = 0,
): Generator<unknown> {
  if (!isObj(err) || seen.has(err) || depth > 8) return
  seen.add(err)
  yield err
  yield* frames(err.cause, seen, depth + 1)
  if (Array.isArray(err.errors)) {
    for (const e of err.errors) yield* frames(e, seen, depth + 1)
  }
}

function read(frame: unknown): HttpErrorInfo | null {
  if (!isObj(frame)) return null
  const code = frame.code

  // 1. Platform already speaks the taxonomy. Future path — after Fetch adopts
  //    `.code`, this branch is the only one that fires and the rest is dead.
  if (typeof code === 'string' && ALL_CODES.has(code)) {
    return {
      code: code as HttpErrorCode,
      attested: true,
      via: 'platform',
      source: frame,
    }
  }

  // 2. Structured protocol field. node:http2 `rstCode`, or anything that has
  //    bothered to keep the numeric code around.
  if (typeof frame.rstCode === 'number') {
    const raw = frame.rstCode
    return {
      code: fromH2(raw),
      attested: true,
      protocol: 'h2',
      rawCode: raw,
      via: 'field',
      source: frame,
    }
  }

  // 3. Message scrape. The only channel undici's fetch leaves open for h2
  //    stream resets. See mapping.parseNghttp2Message.
  if (code === 'ERR_HTTP2_STREAM_ERROR') {
    const parsed = parseNghttp2Message(frame.message)
    if (parsed) {
      return {
        code: fromH2(parsed.rawCode),
        // The peer really did send this code; only our *extraction* is fragile.
        attested: true,
        protocol: 'h2',
        rawCode: parsed.rawCode,
        rawName: parsed.rawName,
        via: 'message',
        source: frame,
      }
    }
    return {
      code: C.STREAM_RESET,
      attested: true,
      protocol: 'h2',
      via: 'message',
      source: frame,
    }
  }

  // 3b. undici >= 8.11 collapses a pre-headers reset into UND_ERR_INFO and a
  //     truncated-with-content-length body into a length mismatch. Both say
  //     "the stream did not finish" and neither carries the peer's code, so
  //     they resolve to the STREAM_RESET catch-all with attested: false. That
  //     is deliberately weaker than the message scrape above: no retry
  //     permission can be derived from either.
  if (
    code === 'UND_ERR_INFO' &&
    typeof frame.message === 'string' &&
    UNDICI_STREAM_CLOSED.test(frame.message)
  ) {
    return {
      code: C.STREAM_RESET,
      attested: false,
      protocol: 'h2',
      via: 'message',
      source: frame,
    }
  }

  if (code === UNDICI_LENGTH_MISMATCH) {
    return {
      code: C.STREAM_RESET,
      attested: false,
      via: 'field',
      source: frame,
    }
  }

  // 4. HTTP-layer signals the peer sent that aren't stream resets (GOAWAY).
  if (typeof code === 'string' && code in ATTESTED_CODE_MAP) {
    return {
      code: ATTESTED_CODE_MAP[code]!,
      attested: true,
      protocol: 'h2',
      via: 'field',
      source: frame,
    }
  }

  // 5. Transport / syscall. Never attested.
  if (typeof code === 'string') {
    const mapped =
      TRANSPORT_CODE_MAP[code] ?? (isTlsCode(code) ? C.TLS_ERROR : undefined)
    if (mapped)
      return { code: mapped, attested: false, via: 'field', source: frame }
  }

  return null
}

/**
 * Extract the best available evidence from a rejected fetch.
 *
 * Returns `undefined` when nothing is recoverable. That is the correct and
 * common answer in browsers, where the Fetch spec's information-destroying
 * funnel is doing exactly what it is designed to do. Do not paper over it.
 */
export function inspect(err: unknown): HttpErrorInfo | undefined {
  const readings: HttpErrorInfo[] = []
  for (const f of frames(err)) {
    const r = read(f)
    if (r) readings.push(r)
  }
  if (readings.length === 0) return undefined

  // Prefer what the peer said over what our socket guessed, and prefer a
  // specific code over the STREAM_RESET catch-all.
  const rank = (r: HttpErrorInfo) =>
    (r.via === 'platform' ? 4 : 0) +
    (r.attested ? 2 : 0) +
    (r.code === C.STREAM_RESET ? 0 : 1)
  return readings.reduce((a, b) => (rank(b) > rank(a) ? b : a))
}

/** Convenience: just the code, or undefined. */
export const codeOf = (err: unknown): HttpErrorCode | undefined =>
  inspect(err)?.code
