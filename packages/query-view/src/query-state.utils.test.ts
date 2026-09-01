import {
  assertNever,
  defaultIsEmpty,
  hasData,
  isAbortError,
} from './query-state.utils'
import { toQueryState } from './query-state'
import type { QueryState } from './types'

describe('hasData', () => {
  it('ready와 degraded에서만 true여야 함', () => {
    const states: [QueryState<number[]>, boolean][] = [
      [{ phase: 'idle' }, false],
      [{ phase: 'loading', paused: false, failureCount: 0 }, false],
      [
        {
          phase: 'failed',
          error: null,
          retrying: false,
          paused: false,
          failureCount: 0,
        },
        false,
      ],
      [
        {
          phase: 'ready',
          data: [1],
          refreshing: false,
          paused: false,
          stale: false,
          provisional: false,
        },
        true,
      ],
      [
        {
          phase: 'degraded',
          data: [1],
          error: null,
          retrying: false,
          paused: false,
        },
        true,
      ],
    ]

    for (const [state, expected] of states) {
      expect(hasData(state)).toBe(expected)
    }
  })

  it('true로 좁혀진 뒤에는 data에 접근할 수 있어야 함', () => {
    const state = toQueryState({ status: 'success', data: [1, 2], error: null })

    expect(hasData(state) ? state.data : []).toEqual([1, 2])
  })
})

describe('defaultIsEmpty', () => {
  it('null과 undefined를 비었다고 봐야 함', () => {
    expect(defaultIsEmpty(null)).toBe(true)
    expect(defaultIsEmpty(undefined)).toBe(true)
  })

  it('배열과 문자열은 길이로 판정해야 함', () => {
    expect(defaultIsEmpty([])).toBe(true)
    expect(defaultIsEmpty([0])).toBe(false)
    expect(defaultIsEmpty('')).toBe(true)
    expect(defaultIsEmpty('a')).toBe(false)
  })

  it('Map과 Set은 size로 판정해야 함', () => {
    expect(defaultIsEmpty(new Map())).toBe(true)
    expect(defaultIsEmpty(new Map([['a', 1]]))).toBe(false)
    expect(defaultIsEmpty(new Set())).toBe(true)
    expect(defaultIsEmpty(new Set([1]))).toBe(false)
  })

  it('빈 객체는 판정하지 않고 비지 않았다고 봐야 함', () => {
    expect(defaultIsEmpty({})).toBe(false)
  })

  it('0과 false는 값이므로 비지 않았다고 봐야 함', () => {
    expect(defaultIsEmpty(0)).toBe(false)
    expect(defaultIsEmpty(false)).toBe(false)
  })
})

describe('isAbortError', () => {
  it('name이 AbortError인 에러를 인정해야 함', () => {
    const error = new Error('aborted')
    error.name = 'AbortError'

    expect(isAbortError(error)).toBe(true)
  })

  it('DOMException 형태의 취소도 인정해야 함', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
  })

  it('일반 에러와 원시값은 취소가 아니어야 함', () => {
    expect(isAbortError(new Error('boom'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
  })
})

describe('assertNever', () => {
  it('처리하지 못한 값을 담아 던져야 함', () => {
    expect(() => assertNever({ phase: 'unknown' } as never)).toThrow(
      /Unhandled query phase: \{"phase":"unknown"\}/,
    )
  })
})
