/**
 * Abstract error code taxonomy.
 *
 * Source: James M Snell, "Fetch Needs Error Codes" (2026-07-12)
 * https://www.jasnell.me/posts/fetch-needs-error-codes
 *
 * This is a *proposed* taxonomy attached to a Stage 1 TC39 proposal
 * (tc39/proposal-error-code-property). Nothing here is standardised.
 * Treat the string values as unstable until Fetch or a WinterTC extension
 * spec actually adopts them.
 */

export const HTTP_ERROR_CODES = {
  // --- Stream-level. Safe to expose cross-origin: the peer voluntarily sent
  //     these *after* the connection was established, so they leak nothing
  //     the peer didn't choose to say.
  REQUEST_REJECTED: 'ERR_HTTP_REQUEST_REJECTED',
  REQUEST_CANCELLED: 'ERR_HTTP_REQUEST_CANCELLED',
  INTERNAL_ERROR: 'ERR_HTTP_INTERNAL_ERROR',
  STREAM_RESET: 'ERR_HTTP_STREAM_RESET',

  // --- Connection-level
  GOAWAY: 'ERR_HTTP_GOAWAY',
  PROTOCOL_ERROR: 'ERR_HTTP_PROTOCOL_ERROR',
  CONNECT_ERROR: 'ERR_HTTP_CONNECT_ERROR',

  // --- Directional (HTTP/3 only; HTTP/2's RST_STREAM is bidirectional)
  RESPONSE_RESET: 'ERR_HTTP_RESPONSE_RESET',
  REQUEST_BODY_REJECTED: 'ERR_HTTP_REQUEST_BODY_REJECTED',

  // --- Transport / pre-connection. Cross-origin exposure is an infrastructure
  //     probe (does the host resolve? is TLS up? is the port open?).
  DNS_RESOLUTION: 'ERR_HTTP_DNS_RESOLUTION',
  TLS_ERROR: 'ERR_HTTP_TLS_ERROR',
  CONNECTION_REFUSED: 'ERR_HTTP_CONNECTION_REFUSED',
  CONNECTION_RESET: 'ERR_HTTP_CONNECTION_RESET',
  TIMEOUT: 'ERR_HTTP_TIMEOUT',
} as const

export type HttpErrorCode =
  (typeof HTTP_ERROR_CODES)[keyof typeof HTTP_ERROR_CODES]

/** Codes the post marks as "should be redacted for cross-origin requests". */
export const PRE_CONNECTION_CODES: ReadonlySet<string> = new Set<HttpErrorCode>(
  [
    HTTP_ERROR_CODES.DNS_RESOLUTION,
    HTTP_ERROR_CODES.TLS_ERROR,
    HTTP_ERROR_CODES.CONNECTION_REFUSED,
    HTTP_ERROR_CODES.CONNECTION_RESET,
    HTTP_ERROR_CODES.TIMEOUT,
  ],
)

export const isPreConnectionCode = (code: string): boolean =>
  PRE_CONNECTION_CODES.has(code)

/**
 * Evidence attached to a normalised error.
 *
 * `attested` is the load-bearing field. It is true only when the *peer* sent a
 * protocol-level error code that we recovered. It is false for anything we
 * inferred from a local syscall, a timeout, or a socket teardown.
 *
 * No retry permission is ever granted on `attested: false`.
 */
export interface HttpErrorInfo {
  code: HttpErrorCode
  attested: boolean
  protocol?: 'h1' | 'h2' | 'h3'
  /** Raw numeric protocol error code, when recoverable. */
  rawCode?: number
  /** Raw protocol error name (e.g. "REFUSED_STREAM"), when recoverable. */
  rawName?: string
  /**
   * How the code was recovered.
   *  - 'field'    structured property on an error object
   *  - 'message'  scraped out of an error message string (brittle, impl-coupled)
   *  - 'platform' the runtime already set `.code` per the proposal
   */
  via: 'field' | 'message' | 'platform'
  /** The error in the cause chain that produced this reading. */
  source: unknown
}
