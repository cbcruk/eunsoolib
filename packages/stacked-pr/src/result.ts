import type { Result } from './types'

/** 성공 Result 생성자. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

/** 실패 Result 생성자. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
