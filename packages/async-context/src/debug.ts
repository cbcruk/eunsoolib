import type { AsyncContext } from './types'

export interface ContextDebugInfo {
  active: boolean
  value: unknown
}

/**
 * 현재 활성화된 컨텍스트들의 상태를 확인한다.
 *
 * @example
 * ```ts
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
