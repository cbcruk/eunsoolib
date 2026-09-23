import { HTTP_ERROR_CODES, type HttpErrorCode } from './codes'

const C = HTTP_ERROR_CODES

/** RFC 9113 §7 — HTTP/2 error codes. */
export const H2_ERROR_NAMES: Record<number, string> = {
  0x00: 'NO_ERROR',
  0x01: 'PROTOCOL_ERROR',
  0x02: 'INTERNAL_ERROR',
  0x03: 'FLOW_CONTROL_ERROR',
  0x04: 'SETTINGS_TIMEOUT',
  0x05: 'STREAM_CLOSED',
  0x06: 'FRAME_SIZE_ERROR',
  0x07: 'REFUSED_STREAM',
  0x08: 'CANCEL',
  0x09: 'COMPRESSION_ERROR',
  0x0a: 'CONNECT_ERROR',
  0x0b: 'ENHANCE_YOUR_CALM',
  0x0c: 'INADEQUATE_SECURITY',
  0x0d: 'HTTP_1_1_REQUIRED',
}

const H2_TO_ABSTRACT: Record<number, HttpErrorCode> = {
  0x01: C.PROTOCOL_ERROR,
  0x02: C.INTERNAL_ERROR,
  0x07: C.REQUEST_REJECTED,
  0x08: C.REQUEST_CANCELLED,
  0x0a: C.CONNECT_ERROR,
  // 0x00 NO_ERROR on RST_STREAM: the post calls it "graceful closure" but the
  // taxonomy table gives it no abstract code. Gap. Falls through to
  // STREAM_RESET rather than inventing ERR_HTTP_NO_ERROR.
  // 0x03..0x06, 0x09, 0x0b..0x0d: protocol plumbing -> STREAM_RESET.
}

/** RFC 9114 §8.1 — HTTP/3 error codes. */
export const H3_ERROR_NAMES: Record<number, string> = {
  0x0100: 'H3_NO_ERROR',
  0x0101: 'H3_GENERAL_PROTOCOL_ERROR',
  0x0102: 'H3_INTERNAL_ERROR',
  0x0103: 'H3_STREAM_CREATION_ERROR',
  0x0104: 'H3_CLOSED_CRITICAL_STREAM',
  0x0105: 'H3_FRAME_UNEXPECTED',
  0x0106: 'H3_FRAME_ERROR',
  0x0107: 'H3_EXCESSIVE_LOAD',
  0x0108: 'H3_ID_ERROR',
  0x0109: 'H3_SETTINGS_ERROR',
  0x010a: 'H3_MISSING_SETTINGS',
  0x010b: 'H3_REQUEST_REJECTED',
  0x010c: 'H3_REQUEST_CANCELLED',
  0x010d: 'H3_REQUEST_INCOMPLETE',
  0x010e: 'H3_MESSAGE_ERROR',
  0x010f: 'H3_CONNECT_ERROR',
  0x0110: 'H3_VERSION_FALLBACK',
}

const H3_TO_ABSTRACT: Record<number, HttpErrorCode> = {
  0x0101: C.PROTOCOL_ERROR,
  0x0102: C.INTERNAL_ERROR,
  0x010b: C.REQUEST_REJECTED,
  0x010c: C.REQUEST_CANCELLED,
  0x010f: C.CONNECT_ERROR,
}

export interface Direction {
  /** HTTP/3 only. 'response' = RESET_STREAM on the response direction.
   *  'request' = STOP_SENDING on the request direction. */
  direction?: 'request' | 'response'
}

export function fromH2(rawCode: number): HttpErrorCode {
  return H2_TO_ABSTRACT[rawCode] ?? C.STREAM_RESET
}

export function fromH3(rawCode: number, opts: Direction = {}): HttpErrorCode {
  // Directional codes only exist for H3. STOP_SENDING on the request direction
  // is "I don't want the rest of your upload" regardless of the numeric code.
  if (opts.direction === 'request') return C.REQUEST_BODY_REJECTED
  const mapped = H3_TO_ABSTRACT[rawCode]
  if (mapped) return mapped
  if (opts.direction === 'response') return C.RESPONSE_RESET
  return C.STREAM_RESET
}

/** Node prefixes its nghttp2 error names. Reverse-index by name. */
const H2_NAME_TO_NUM: Record<string, number> = Object.fromEntries(
  Object.entries(H2_ERROR_NAMES).map(([n, name]) => [name, Number(n)]),
)

/**
 * Recover an HTTP/2 error code from Node's ERR_HTTP2_STREAM_ERROR message.
 *
 * This exists because undici's fetch does NOT expose `rstCode` anywhere; the
 * only surviving channel is the message string:
 *   "Stream closed with error code NGHTTP2_REFUSED_STREAM"
 *
 * Brittle by construction. Coupled to Node internals, not to any spec. It is
 * the reason this library exists and the first thing to delete when Fetch
 * ships `.code`.
 */
export function parseNghttp2Message(
  message: unknown,
): { rawCode: number; rawName: string } | null {
  if (typeof message !== 'string') return null
  const m = /\bNGHTTP2_([A-Z0-9_]+)\b/.exec(message)
  if (!m) return null
  const rawName = m[1]!
  const rawCode = H2_NAME_TO_NUM[rawName]
  if (rawCode === undefined) return null
  return { rawCode, rawName }
}

/**
 * undici >= 8.11 reports a pre-headers RST_STREAM as a bare `UND_ERR_INFO`
 * with this message and no numeric code. Earlier versions left the promise
 * unsettled instead, so this string is the *good* news — but the peer's error
 * code is gone, and all we can honestly say is "the stream was reset".
 */
export const UNDICI_STREAM_CLOSED =
  /stream closed before the response was complete/i

/**
 * A response that stops short of its `content-length`. undici raises this
 * locally after comparing bytes; the peer said nothing, so it is never
 * attested. It is still evidence the response was cut off mid-flight — which
 * is strictly more than the silent truncation that happens with no
 * `content-length` at all.
 */
export const UNDICI_LENGTH_MISMATCH = 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH'

/**
 * Node / undici error codes that are *below* the HTTP layer.
 * Everything here yields `attested: false` — the peer never told us this;
 * we inferred it from our own socket.
 */
export const TRANSPORT_CODE_MAP: Record<string, HttpErrorCode> = {
  // DNS
  ENOTFOUND: C.DNS_RESOLUTION,
  EAI_AGAIN: C.DNS_RESOLUTION,
  EAI_NODATA: C.DNS_RESOLUTION,
  // connect
  ECONNREFUSED: C.CONNECTION_REFUSED,
  EHOSTUNREACH: C.CONNECTION_REFUSED,
  ENETUNREACH: C.CONNECTION_REFUSED,
  // reset
  ECONNRESET: C.CONNECTION_RESET,
  EPIPE: C.CONNECTION_RESET,
  UND_ERR_SOCKET: C.CONNECTION_RESET,
  // timeout
  ETIMEDOUT: C.TIMEOUT,
  UND_ERR_CONNECT_TIMEOUT: C.TIMEOUT,
  UND_ERR_HEADERS_TIMEOUT: C.TIMEOUT,
  UND_ERR_BODY_TIMEOUT: C.TIMEOUT,
  // TLS
  CERT_HAS_EXPIRED: C.TLS_ERROR,
  DEPTH_ZERO_SELF_SIGNED_CERT: C.TLS_ERROR,
  SELF_SIGNED_CERT_IN_CHAIN: C.TLS_ERROR,
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: C.TLS_ERROR,
  ERR_TLS_CERT_ALTNAME_INVALID: C.TLS_ERROR,
  // http/2 session errors we raised locally
  ERR_HTTP2_SESSION_ERROR: C.PROTOCOL_ERROR,
  ERR_HTTP2_INVALID_SESSION: C.PROTOCOL_ERROR,
}

/**
 * HTTP-layer codes where the *peer* is the source of the signal. These are
 * attested: the server sent a frame saying this. Kept deliberately separate
 * from TRANSPORT_CODE_MAP, because only this set can ever grant retry
 * permission for a non-idempotent method.
 */
export const ATTESTED_CODE_MAP: Record<string, HttpErrorCode> = {
  ERR_HTTP2_GOAWAY_SESSION: C.GOAWAY,
}

export const isTlsCode = (code: string): boolean =>
  code.startsWith('ERR_SSL_') ||
  (code in TRANSPORT_CODE_MAP && TRANSPORT_CODE_MAP[code] === C.TLS_ERROR)
