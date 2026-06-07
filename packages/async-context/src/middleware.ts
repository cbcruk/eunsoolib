import type { AsyncContext } from './types'

export type MiddlewareFunction<TInput, TOutput> = (
  input: TInput,
  next: () => Promise<TOutput>,
) => Promise<TOutput>

/**
 * 미들웨어 패턴으로 컨텍스트를 설정한다.
 * Express/Koa 스타일의 미들웨어 체인을 구성할 수 있다.
 *
 * @example
 * ```ts
 * const authMiddleware = createContextMiddleware(
 *   userContext,
 *   async (req) => authenticate(req.headers.authorization)
 * );
 *
 * const result = await runWithMiddlewares(
 *   request,
 *   [authMiddleware],
 *   async () => handleRequest()
 * );
 * ```
 */
export function createContextMiddleware<TContext, TInput>(
  context: AsyncContext<TContext>,
  resolver: (input: TInput) => TContext | Promise<TContext>,
): MiddlewareFunction<TInput, unknown> {
  return async (input, next) => {
    const value = await resolver(input)
    return context.run(value, next)
  }
}

/**
 * 미들웨어 체인을 순서대로 실행한다.
 */
export async function runWithMiddlewares<TInput, TOutput>(
  input: TInput,
  middlewares: MiddlewareFunction<TInput, TOutput>[],
  handler: () => Promise<TOutput>,
): Promise<TOutput> {
  const runMiddleware = async (index: number): Promise<TOutput> => {
    const middleware = middlewares[index]
    if (!middleware) {
      return handler()
    }

    return middleware(input, () => runMiddleware(index + 1))
  }

  return runMiddleware(0)
}
