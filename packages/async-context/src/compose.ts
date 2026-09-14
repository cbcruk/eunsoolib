import type { AsyncContext, ContextValues } from './types'

/**
 * 여러 컨텍스트를 조합하여 한 번에 설정한다.
 *
 * `contexts`의 키 순서대로 `run()`을 중첩한 뒤 가장 안쪽에서 `callback`을 실행하고,
 * 그 반환값을 그대로 돌려준다.
 *
 * @template T - 키별 {@linkcode AsyncContext} 맵
 * @template R - `callback`의 반환 타입. 비동기 콜백이면 `Promise`
 * @param values - `contexts`와 같은 키에 각 컨텍스트에 설정할 값
 * @example
 * ```ts
 * import { composeContexts } from "@cbcruk/async-context";
 *
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
  R = unknown,
>(contexts: T, values: ContextValues<T>, callback: () => R): R {
  const entries = Object.entries(contexts) as Array<
    [keyof T, AsyncContext<unknown>]
  >

  const runNested = (index: number): R => {
    const entry = entries[index]
    if (!entry) {
      return callback()
    }

    const [key, context] = entry
    return context.run(values[key], () => runNested(index + 1))
  }

  return runNested(0)
}

/**
 * 컨텍스트 객체에서 모든 값을 한 번에 가져온다.
 *
 * @example
 * ```ts
 * import { getContextValues } from "@cbcruk/async-context";
 *
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
