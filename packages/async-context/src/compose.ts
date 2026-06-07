import type { AsyncContext, ContextValues } from './types'

/**
 * 여러 컨텍스트를 조합하여 한 번에 설정한다.
 *
 * @example
 * ```ts
 * const result = await composeContexts(
 *   { user: userContext, request: requestContext },
 *   { user: currentUser, request: req },
 *   async () => {
 *     const user = userContext.get();
 *     const request = requestContext.get();
 *     return handleRequest();
 *   }
 * );
 * ```
 */
export function composeContexts<
  T extends Record<string, AsyncContext<unknown>>,
>(
  contexts: T,
  values: ContextValues<T>,
  callback: () => unknown,
): ReturnType<typeof callback> {
  const entries = Object.entries(contexts) as Array<
    [keyof T, AsyncContext<unknown>]
  >

  const runNested = (index: number): unknown => {
    const entry = entries[index]
    if (!entry) {
      return callback()
    }

    const [key, context] = entry
    return context.run(values[key], () => runNested(index + 1))
  }

  return runNested(0) as ReturnType<typeof callback>
}

/**
 * 컨텍스트 객체에서 모든 값을 한 번에 가져온다.
 *
 * @example
 * ```ts
 * const { user, request } = getContextValues({
 *   user: userContext,
 *   request: requestContext,
 * });
 * ```
 */
export function getContextValues<
  T extends Record<string, AsyncContext<unknown>>,
>(contexts: T): ContextValues<T> {
  const result = {} as ContextValues<T>

  for (const [key, context] of Object.entries(contexts)) {
    ;(result as Record<string, unknown>)[key] = context.get()
  }

  return result
}
