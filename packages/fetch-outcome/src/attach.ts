/**
 * Ponyfill for tc39/proposal-error-code-property (Stage 1 -> 2.7 candidate).
 *
 * The proposal extends the Error constructor options bag — the same one `cause`
 * was added to in ES2022 — to accept `code`. Property descriptor semantics are
 * specified to match `cause` exactly: own property on the instance (not the
 * prototype), non-enumerable, writable, configurable, absent when not provided.
 */

/** True once the runtime honours `new Error(msg, { code })`. */
export const hasNativeErrorCode: boolean = (() => {
  try {
    // @ts-expect-error probing a not-yet-standard options bag
    return 'code' in new Error('probe', { code: 'PROBE' })
  } catch {
    return false
  }
})()

/**
 * Install `.code` with the proposal's descriptor.
 *
 * Mirrors the spec's InstallErrorCause shape: absent unless provided, and
 * `{ writable: true, enumerable: false, configurable: true }`. Getting the
 * enumerability right matters — an enumerable `code` would start showing up in
 * `JSON.stringify`, `{...err}` spreads and structured-clone-adjacent code paths
 * that today only see `message`/`stack`, which is a behaviour change the
 * proposal deliberately avoids.
 */
export function installErrorCode<E extends object>(err: E, code: unknown): E {
  Object.defineProperty(err, 'code', {
    value: code,
    writable: true,
    enumerable: false,
    configurable: true,
  })
  return err
}

export interface ErrorOptionsWithCode extends ErrorOptions {
  code?: unknown
}

type ErrCtor<E extends Error> = new (
  message?: string,
  options?: ErrorOptions,
) => E

/**
 * `createError(TypeError, "stream reset by server", { code: "ERR_HTTP_REQUEST_REJECTED" })`
 *
 * Under a native implementation this is a straight pass-through. Today the
 * engine silently ignores unknown options-bag keys, so we install after
 * construction. `code` is only installed when the key is *present*, matching
 * the proposal — `{ code: undefined }` yields `code === undefined` as an own
 * property; omitting the key yields no property at all.
 */
export function createError<E extends Error>(
  Ctor: ErrCtor<E>,
  message?: string,
  options?: ErrorOptionsWithCode,
): E {
  const err = new Ctor(message, options)
  if (hasNativeErrorCode) return err
  if (options && 'code' in options) installErrorCode(err, options.code)
  return err
}

/**
 * Attach `.code` without clobbering a value the platform put there.
 *
 * This is the migration seam. Once a runtime implements the Fetch changes, its
 * TypeError arrives with `.code` already set and this becomes a no-op — call
 * sites reading `e.code` never change.
 */
export function adoptErrorCode<E extends object>(err: E, code: unknown): E {
  if (Object.prototype.hasOwnProperty.call(err, 'code')) return err
  return installErrorCode(err, code)
}
