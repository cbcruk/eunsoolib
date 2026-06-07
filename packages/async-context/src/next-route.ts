import type { AsyncContext } from './types'

export type NextRouteHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response

export type ContextSetup<T> = (request: Request) => T | Promise<T>

/**
 * Next.js Route Handler를 컨텍스트로 감싸는 래퍼를 생성한다.
 *
 * @example
 * ```ts
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

export interface RouteContextConfig<T> {
  context: AsyncContext<T>
  setup: ContextSetup<T>
}

/**
 * 여러 컨텍스트를 한 번에 설정하는 Route Handler 래퍼를 생성한다.
 *
 * @example
 * ```ts
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
