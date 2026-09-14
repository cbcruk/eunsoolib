import type { AsyncContext } from './types'

/** {@linkcode debugContexts}가 컨텍스트마다 돌려주는 상태. */
export interface ContextDebugInfo {
  /** {@linkcode AsyncContext.isActive}의 결과. */
  active: boolean
  /** {@linkcode AsyncContext.getOptional}의 결과. 비활성이면 `undefined`. */
  value: unknown
}

/**
 * 현재 활성화된 컨텍스트들의 상태를 확인한다.
 *
 * @example
 * ```ts
 * import { debugContexts } from "@cbcruk/async-context";
 *
 * const status = debugContexts({ user: userContext, request: requestContext });
 * // { user: { active: true, value: {...} }, request: { active: false, value: undefined } }
 * ```
 */
export function debugContexts<T extends Record<string, AsyncContext<unknown>>>(
  contexts: T,
): Record<keyof T, ContextDebugInfo> {
  const result = {} as Record<keyof T, ContextDebugInfo>

  for (const [key, context] of Object.entries(contexts)) {
    result[key as keyof T] = {
      active: context.isActive(),
      value: context.getOptional(),
    }
  }

  return result
}
