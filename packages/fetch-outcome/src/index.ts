import { isPreConnectionCode } from './codes'
import { inspect } from './normalize'
import { assessRetry, isIdempotentMethod } from './retry'
import type { FetchOutcome, FetchFailure } from './outcome'

export {
  HTTP_ERROR_CODES,
  PRE_CONNECTION_CODES,
  isPreConnectionCode,
  type HttpErrorCode,
  type HttpErrorInfo,
} from './codes'
export { inspect, codeOf } from './normalize'
export {
  hasNativeErrorCode,
  installErrorCode,
  createError,
  adoptErrorCode,
  type ErrorOptionsWithCode,
} from './attach'
export {
  assessRetry,
  isSafeToRetry,
  isIdempotentMethod,
  type Retryability,
  type RetryVerdict,
} from './retry'
export { fromH2, fromH3, H2_ERROR_NAMES, H3_ERROR_NAMES } from './mapping'
export {
  type FetchOutcome,
  type FetchFailure,
  isOk,
  isFailure,
} from './outcome'

export interface SafeFetchOptions {
  fetch?: typeof globalThis.fetch
  /**
   * Apply the post's proposed cross-origin redaction: pre-connection codes
   * (DNS, TLS, connection refused/reset, timeout) reveal the target's network
   * topology and are suppressed for cross-origin requests.
   *
   * Default: true in a browser-like environment (a `location` exists), false
   * otherwise. Server-side runtimes have no CORS threat model and skip this the
   * same way they already skip CORS enforcement.
   */
  redactCrossOrigin?: boolean
  /** Origin to compare against. Defaults to `location.origin` when present. */
  origin?: string
}

const defaultOrigin = (): string | undefined =>
  typeof location !== 'undefined' ? location.origin : undefined

function isCrossOrigin(
  input: RequestInfo | URL,
  origin: string | undefined,
): boolean {
  if (!origin) return false
  const url = input instanceof Request ? input.url : String(input)
  try {
    return new URL(url, origin).origin !== origin
  } catch {
    return false
  }
}

/** Turn a thrown error into the non-`ok` arm of a {@link FetchOutcome}. */
function failureFromError(err: unknown, method: string): FetchFailure {
  const info = inspect(err)
  const v = assessRetry(err, method)
  if (info) {
    return {
      kind: 'failed',
      retry: v.retryability,
      attested: v.attested,
      reason: v.reason,
      code: info.code,
      evidence: info,
    }
  }
  return {
    kind: 'indeterminate',
    retry: v.retryability,
    reason: v.reason,
    raw: err,
  }
}

/**
 * `fetch`, but failure is returned as data instead of thrown.
 *
 * This is the headline of the package. Rather than re-throwing a `TypeError`
 * with a `.code` bolted on — a bet on a spec that has not landed — `safeFetch`
 * answers the question a failed request actually has: *may I retry this?* Every
 * non-`ok` outcome carries a `retry` verdict, and an unrecoverable failure is an
 * honest `indeterminate` rather than a rethrow the caller has to re-inspect.
 *
 * @example
 * ```ts
 * import { safeFetch } from '@cbcruk/fetch-outcome'
 *
 * const out = await safeFetch(url, { method: 'POST', body })
 * switch (out.kind) {
 *   case 'ok':
 *     return out.value
 *   case 'failed':
 *     return out.retry === 'safe' && out.attested ? retry() : fail(out)
 *   case 'indeterminate':
 *     return giveUp(out.reason)
 * }
 * ```
 *
 * Note this resolves on the *headers*. A reset that lands mid-body is not seen
 * here; consume the body through {@link safeText} to catch that.
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: SafeFetchOptions = {},
): Promise<FetchOutcome<Response>> {
  const base = opts.fetch ?? globalThis.fetch
  const origin = opts.origin ?? defaultOrigin()
  const redact = opts.redactCrossOrigin ?? origin !== undefined
  const method = init?.method ?? 'GET'

  try {
    return { kind: 'ok', value: await base(input, init) }
  } catch (err) {
    const info = inspect(err)
    // Cross-origin redaction: a pre-connection code leaks the target's network
    // topology, so we decline to surface it — and decline the 'safe' verdict it
    // would have justified. The caller gets an honest "can't say", not the code.
    if (
      info &&
      redact &&
      isPreConnectionCode(info.code) &&
      isCrossOrigin(input, origin)
    ) {
      return {
        kind: 'indeterminate',
        retry: isIdempotentMethod(method) ? 'safe' : 'unknown',
        reason:
          'cross-origin pre-connection failure; network-topology code redacted',
        raw: err,
      }
    }
    return failureFromError(err, method)
  }
}

/**
 * Read a response body to text as an outcome. A reset that surfaces on the body
 * `ReadableStream` — which the Fetch spec errors with a bare `TypeError`, same
 * as a pre-headers failure — becomes a `failed`/`indeterminate` outcome instead
 * of a thrown error or a silently short read.
 *
 * The one condition this cannot catch: an h2 stream reset mid-body with **no
 * `content-length`**. undici resolves the stream as complete, so `.text()`
 * returns the truncated bytes with no error and the outcome is a deceptive
 * `ok`. That gap lives in undici's body handling, below this layer; it is
 * documented, not solved.
 */
export async function safeText(
  response: Response,
  opts: { method?: string } = {},
): Promise<FetchOutcome<string>> {
  const method = opts.method ?? 'GET'
  try {
    return { kind: 'ok', value: await response.text() }
  } catch (err) {
    return failureFromError(err, method)
  }
}
