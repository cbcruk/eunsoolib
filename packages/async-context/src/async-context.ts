import { AsyncLocalStorage } from 'async_hooks'
import type { AsyncContext } from './types'

/** 컨텍스트 밖에서 {@linkcode AsyncContext.get}을 호출했을 때 던지는 에러. */
export class ContextNotFoundError extends Error {
  /** @param message - 에러 메시지. `name`은 `'ContextNotFoundError'`로 고정된다. */
  constructor(message: string) {
    super(message)
    this.name = 'ContextNotFoundError'
  }
}

/**
 * {@linkcode createAsyncContext}의 옵션.
 *
 * @template T - 컨텍스트에 담을 값의 타입
 */
export interface ContextOptions<T> {
  /**
   * 컨텍스트 이름 (에러 메시지에서 사용).
   *
   * @default 'anonymous'
   */
  name?: string

  /**
   * 기본값 (설정하면 get()이 에러 대신 기본값 반환).
   */
  defaultValue?: T

  /**
   * 컨텍스트가 없을 때 에러 메시지 커스터마이징.
   */
  errorMessage?: string
}

/**
 * 새로운 AsyncContext를 생성한다.
 *
 * @example
 * ```ts
 * import { createAsyncContext } from "@cbcruk/async-context";
 *
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * const userContext = createAsyncContext<User>({ name: "user" });
 *
 * const result = await userContext.run({ id: "1", name: "John" }, async () => {
 *   const user = userContext.get();
 *   return user.name;
 * });
 * ```
 */
export function createAsyncContext<T>(
  options: ContextOptions<T> = {},
): AsyncContext<T> {
  const { name = 'anonymous', defaultValue, errorMessage } = options
  const storage = new AsyncLocalStorage<T>()

  const get = (): T => {
    const store = storage.getStore()

    if (store === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue
      }

      throw new ContextNotFoundError(
        errorMessage ??
          `Context "${name}" not found. ` +
            `Ensure the calling function is wrapped in a ${name}Context.run() block.`,
      )
    }

    return store
  }

  return {
    name,

    run<R>(value: T, callback: () => R): R {
      return storage.run(value, callback)
    },

    get,

    getOptional(): T | undefined {
      return storage.getStore()
    },

    isActive(): boolean {
      return storage.getStore() !== undefined
    },
  }
}

/**
 * 특정 스코프 내에서만 유효한 컨텍스트 값을 설정한다.
 * 부모 컨텍스트의 값을 오버라이드하지 않고 독립적인 스코프를 만든다.
 *
 * @example
 * ```ts
 * import { createAsyncContext, scopedRun } from "@cbcruk/async-context";
 *
 * const requestIdContext = createAsyncContext<string>({ name: "requestId" });
 *
 * await requestIdContext.run("parent-123", async () => {
 *   await scopedRun(requestIdContext, "child-456", async () => {
 *     requestIdContext.get(); // "child-456"
 *   });
 *
 *   requestIdContext.get(); // "parent-123"
 * });
 * ```
 */
export function scopedRun<T, R>(
  context: AsyncContext<T>,
  value: T,
  callback: () => R,
): R {
  return context.run(value, callback)
}
