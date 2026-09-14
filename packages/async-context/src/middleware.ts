import type { AsyncContext } from './types'

/**
 * 입력을 받아 `next`로 다음 단계를 실행하는 미들웨어.
 *
 * @template TInput - 체인에 넘기는 입력(예: 요청)의 타입
 * @template TOutput - 핸들러가 돌려주는 결과의 타입
 */
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
 * import { createContextMiddleware, runWithMiddlewares } from "@cbcruk/async-context";
 *
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
