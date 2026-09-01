import { toQueryState } from './query-state'
import type { QueryLike, QueryPhase } from './types'

function query<T>(
  overrides: Partial<QueryLike<T>> & Pick<QueryLike<T>, 'status'>,
): QueryLike<T> {
  return { data: undefined, error: null, ...overrides }
}

const matrix: [string, QueryLike<number[]>, QueryPhase][] = [
  ['enabled: false', query({ status: 'pending', fetchStatus: 'idle' }), 'idle'],
  [
    '최초 로딩',
    query({ status: 'pending', fetchStatus: 'fetching' }),
    'loading',
  ],
  [
    '오프라인 최초 로딩',
    query({ status: 'pending', fetchStatus: 'paused' }),
    'loading',
  ],
  [
    '성공',
    query({ status: 'success', data: [1], fetchStatus: 'idle' }),
    'ready',
  ],
  [
    '백그라운드 갱신',
    query({ status: 'success', data: [1], fetchStatus: 'fetching' }),
    'ready',
  ],
  [
    '오프라인 + 캐시',
    query({ status: 'success', data: [1], fetchStatus: 'paused' }),
    'ready',
  ],
  [
    'keepPreviousData',
    query({
      status: 'success',
      data: [1],
      fetchStatus: 'fetching',
      isPlaceholderData: true,
    }),
    'ready',
  ],
  [
    '실패(데이터 없음)',
    query({ status: 'error', error: new Error('x') }),
    'failed',
  ],
  [
    '실패(이전 데이터 있음)',
    query({ status: 'error', error: new Error('x'), data: [1] }),
    'degraded',
  ],
  [
    '실패 후 재시도 중',
    query({ status: 'error', error: new Error('x'), fetchStatus: 'fetching' }),
    'failed',
  ],
]

describe('toQueryState', () => {
  it.each(matrix)('%s → %s', (_label, input, expected) => {
    expect(toQueryState(input).phase).toBe(expected)
  })

  it('fetchStatus를 생략하면 idle로 봐야 함', () => {
    expect(toQueryState(query({ status: 'pending' })).phase).toBe('idle')
  })

  it('pending + fetching은 paused를 false로 둬야 함', () => {
    const state = toQueryState(
      query({ status: 'pending', fetchStatus: 'fetching', failureCount: 2 }),
    )

    expect(state).toEqual({ phase: 'loading', paused: false, failureCount: 2 })
  })

  it('pending + paused는 loading이면서 paused여야 함', () => {
    const state = toQueryState(
      query({ status: 'pending', fetchStatus: 'paused' }),
    )

    expect(state).toEqual({ phase: 'loading', paused: true, failureCount: 0 })
  })

  it('success + fetching은 refreshing modifier를 켜야 함', () => {
    const state = toQueryState(
      query({ status: 'success', data: [1], fetchStatus: 'fetching' }),
    )

    expect(state).toMatchObject({
      phase: 'ready',
      data: [1],
      refreshing: true,
      paused: false,
    })
  })

  it('success + paused는 refreshing이 아니라 paused여야 함', () => {
    const state = toQueryState(
      query({ status: 'success', data: [1], fetchStatus: 'paused' }),
    )

    expect(state).toMatchObject({
      phase: 'ready',
      refreshing: false,
      paused: true,
    })
  })

  it('isStale과 isPlaceholderData를 stale/provisional로 옮겨야 함', () => {
    const state = toQueryState(
      query({
        status: 'success',
        data: [1],
        isStale: true,
        isPlaceholderData: true,
      }),
    )

    expect(state).toMatchObject({
      phase: 'ready',
      stale: true,
      provisional: true,
    })
  })

  it('isStale과 isPlaceholderData가 없으면 false로 채워야 함', () => {
    const state = toQueryState(query({ status: 'success', data: [1] }))

    expect(state).toMatchObject({ stale: false, provisional: false })
  })

  it('data가 null이어도 성공은 ready여야 함', () => {
    const state = toQueryState<number[] | null>(
      query({ status: 'success', data: null }),
    )

    expect(state).toMatchObject({ phase: 'ready', data: null })
  })

  it('실패 + 이전 데이터는 error와 data를 함께 실어야 함', () => {
    const error = new Error('refresh failed')
    const state = toQueryState(query({ status: 'error', error, data: [1, 2] }))

    expect(state).toEqual({
      phase: 'degraded',
      data: [1, 2],
      error,
      retrying: false,
      paused: false,
    })
  })

  it('실패 + 재시도 중이면 retrying을 켜야 함', () => {
    const state = toQueryState(
      query({
        status: 'error',
        error: new Error('x'),
        fetchStatus: 'fetching',
        failureCount: 3,
      }),
    )

    expect(state).toMatchObject({
      phase: 'failed',
      retrying: true,
      failureCount: 3,
    })
  })

  it('실패 + 오프라인이면 paused를 켜야 함', () => {
    const state = toQueryState(
      query({ status: 'error', error: new Error('x'), fetchStatus: 'paused' }),
    )

    expect(state).toMatchObject({
      phase: 'failed',
      retrying: false,
      paused: true,
    })
  })
})
