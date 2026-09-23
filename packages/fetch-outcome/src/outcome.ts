import type { HttpErrorCode, HttpErrorInfo } from './codes'
import type { Retryability } from './retry'

/**
 * The result of a fetch, with failure — and "we don't know" — modelled as data
 * rather than a thrown, information-lossy TypeError.
 *
 * `retry` is the headline. Every non-`ok` arm carries a retry decision because
 * that is the one question a failed request always has to answer, whether or
 * not a protocol code was recoverable. The taxonomy `code`/`evidence` is
 * supporting detail *under* that decision, not the point of the type.
 *
 *  - `ok`             the request resolved. (A silently truncated body still
 *                     lands here; see `safeText` for the one gap that cannot be
 *                     closed at this layer.)
 *  - `failed`         a protocol/transport code was recovered. `attested` says
 *                     whether the peer actually sent it or we inferred it.
 *  - `indeterminate`  nothing was recoverable — a browser's opaque TypeError,
 *                     one of undici's swallowed resets, or an error-message
 *                     format we no longer recognise. `reason` says which. This
 *                     is a first-class answer, not `undefined`.
 */
export type FetchOutcome<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | {
      readonly kind: 'failed'
      readonly retry: Retryability
      readonly attested: boolean
      readonly reason: string
      readonly code: HttpErrorCode
      readonly evidence: HttpErrorInfo
    }
  | {
      readonly kind: 'indeterminate'
      readonly retry: Retryability
      readonly reason: string
      readonly raw: unknown
    }

/** The non-`ok` arms, for consumers that fold both failure shapes together. */
export type FetchFailure = Exclude<FetchOutcome<unknown>, { kind: 'ok' }>

export const isOk = <T>(o: FetchOutcome<T>): o is { kind: 'ok'; value: T } =>
  o.kind === 'ok'

export const isFailure = <T>(o: FetchOutcome<T>): o is FetchFailure =>
  o.kind !== 'ok'
