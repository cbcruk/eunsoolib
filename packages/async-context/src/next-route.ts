import type { AsyncContext } from './types'

/** Next.js App Router의 Route Handler 시그니처. */
export type NextRouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response

/**
 * 요청에서 컨텍스트 값을 만드는 함수. 비동기여도 된다.
 *
 * @template T - 만들어 낼 컨텍스트 값의 타입
 */
export type ContextSetup<T> = (request: Request) => T | Promise<T>

/**
 * Next.js Route Handler를 컨텍스트로 감싸는 래퍼를 생성한다.
 *
 * @example
 * ```ts
 * import { createRouteWrapper } from "@cbcruk/async-context";
 *
 * const withUser = createRouteWrapper(userContext, async (request) => {
 *   return auth(request);
 * });
 *
 * export const GET = withUser(async (request) => {
 *   const user = userContext.get();
 *   return Response.json({ user });
 * });
 * ```
 */
export function createRouteWrapper<T>(
  context: AsyncContext<T>,
  setup: ContextSetup<T>,
): (handler: NextRouteHandler) => NextRouteHandler {
  return (handler) => {
    return async (request, routeContext) => {
      const value = await setup(request)
      return context.run(value, () => handler(request, routeContext))
    }
  }
}

/**
 * {@linkcode createMultiRouteWrapper}에 넘기는 컨텍스트 하나의 설정.
 *
 * @template T - 컨텍스트 값의 타입
 */
export interface RouteContextConfig<T> {
  /** 값을 설정할 컨텍스트. */
  context: AsyncContext<T>
  /** 요청마다 컨텍스트 값을 만드는 함수. */
  setup: ContextSetup<T>
}

/**
 * 여러 컨텍스트를 한 번에 설정하는 Route Handler 래퍼를 생성한다.
 *
 * 모든 `setup`은 `Promise.all`로 동시에 실행된 뒤, 결과로 컨텍스트를 중첩 설정한다.
 *
 * @example
 * ```ts
 * import { createMultiRouteWrapper } from "@cbcruk/async-context";
 *
 * const withContext = createMultiRouteWrapper({
 *   user: { context: userContext, setup: (req) => auth(req) },
 *   db: { context: dbContext, setup: () => createDbConnection() },
 * });
 *
 * export const GET = withContext(async () => {
 *   const user = userContext.get();
 *   const db = dbContext.get();
 *   return Response.json(await db.getProfile(user.id));
 * });
 * ```
 */
export function createMultiRouteWrapper<
  T extends Record<string, RouteContextConfig<unknown>>,
>(configs: T): (handler: NextRouteHandler) => NextRouteHandler {
  return (handler) => {
    return async (request, routeContext) => {
      const entries = Object.entries(configs)
      const values = await Promise.all(
        entries.map(async ([, config]) => config.setup(request)),
      )

      const contextEntries = entries.map(([, config], index) => ({
        context: config.context,
        value: values[index],
      }))

      const runNested = (index: number): Promise<Response> | Response => {
        const entry = contextEntries[index]
        if (!entry) {
          return handler(request, routeContext)
        }

        const { context, value } = entry
        return context.run(value, () => runNested(index + 1))
      }

      return runNested(0)
    }
  }
}
