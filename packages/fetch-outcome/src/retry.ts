import { HTTP_ERROR_CODES } from './codes'
import { inspect } from './normalize'

const C = HTTP_ERROR_CODES

/** RFC 9110 §9.2.2 */
const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'HEAD',
  'PUT',
  'DELETE',
  'OPTIONS',
  'TRACE',
])

export type Retryability = 'safe' | 'unsafe' | 'unknown'

export interface RetryVerdict {
  retryability: Retryability
  /** Human-readable justification. Log this; it is the audit trail. */
  reason: string
  /** True when the verdict rests on a guarantee the server actually made. */
  attested: boolean
}

/**
 * Decide whether a failed request may be replayed.
 *
 * The single invariant: a non-idempotent method is only ever 'safe' when the
 * server *attested* that it did not process the request. That means an actual
 * REFUSED_STREAM / H3_REQUEST_REJECTED on the wire — RFC 9113 §8.7 and
 * RFC 9114 §4.1.1 both grant automatic retry of non-idempotent methods on this
 * signal, and nothing else does.
 *
 * A local ECONNRESET looks similar and is not the same thing. It means our
 * socket died; the server may well have committed the transaction. Inferring
 * REQUEST_REJECTED from a transport error would turn a diagnostic library into
 * a double-charge generator.
 */
export function assessRetry(
  err: unknown,
  method: string = 'GET',
): RetryVerdict {
  const m = method.toUpperCase()
  const idempotent = IDEMPOTENT_METHODS.has(m)
  const info = inspect(err)

  if (info?.attested && info.code === C.REQUEST_REJECTED) {
    return {
      retryability: 'safe',
      reason: `server sent ${info.rawName ?? 'REFUSED_STREAM'}: request was not processed (RFC 9113 §8.7)`,
      attested: true,
    }
  }

  if (info?.attested && info.code === C.GOAWAY) {
    // The post flags this: GOAWAY's retry guarantee only covers streams above
    // last-stream-id, and last-stream-id is not exposed anywhere in the
    // proposed surface. We refuse to guess.
    return idempotent
      ? {
          retryability: 'safe',
          reason: `GOAWAY; ${m} is idempotent`,
          attested: false,
        }
      : {
          retryability: 'unknown',
          reason:
            'GOAWAY, but last-stream-id is not exposed — cannot prove this stream was unprocessed',
          attested: false,
        }
  }

  if (info?.attested && info.code === C.REQUEST_CANCELLED) {
    return idempotent
      ? {
          retryability: 'safe',
          reason: `cancelled; ${m} is idempotent`,
          attested: false,
        }
      : {
          retryability: 'unsafe',
          reason:
            'cancelled after possible partial processing; replaying a non-idempotent method is unsound',
          attested: true,
        }
  }

  if (info?.attested && info.code === C.INTERNAL_ERROR) {
    return idempotent
      ? {
          retryability: 'safe',
          reason: `remote internal error; ${m} is idempotent`,
          attested: false,
        }
      : {
          retryability: 'unsafe',
          reason: 'remote internal error may have followed partial processing',
          attested: true,
        }
  }

  if (info?.code === C.CONNECTION_REFUSED || info?.code === C.DNS_RESOLUTION) {
    // Never reached the server's HTTP stack at all.
    return {
      retryability: 'safe',
      reason: `${info.code}: no request was ever transmitted`,
      attested: false,
    }
  }

  if (idempotent) {
    return {
      retryability: 'safe',
      reason: `${m} is idempotent by method semantics`,
      attested: false,
    }
  }

  return {
    retryability: 'unknown',
    reason: info
      ? `${info.code} carries no processing guarantee for ${m}`
      : `no error code recoverable; ${m} may or may not have been processed`,
    attested: false,
  }
}

/** Narrow helper for the common case. */
export const isSafeToRetry = (err: unknown, method = 'GET'): boolean =>
  assessRetry(err, method).retryability === 'safe'

/** Whether a method may be replayed on its RFC 9110 §9.2.2 semantics alone. */
export const isIdempotentMethod = (method: string): boolean =>
  IDEMPOTENT_METHODS.has(method.toUpperCase())
