import type { QueryLike, QueryState } from './types'

/**
 * {@linkcode QueryLike}를 {@linkcode QueryState}로 분류한다.
 *
 * 이 라이브러리에서 Query의 형태를 아는 유일한 함수다. 어댑터가 아니라 투영이라
 * 정보가 줄지 않는다 — 두 축의 모든 조합이 phase 하나와 modifier 몇 개로 그대로
 * 옮겨간다.
 *
 * 분류에서 눈여겨볼 두 지점:
 *
 * - `status: 'pending'` + `fetchStatus: 'idle'`은 `loading`이 아니라 `idle`이다.
 *   `enabled: false`와 `skipToken`이 여기로 오는데, "시도 중"이 아니라
 *   "시도 이전"이므로 스켈레톤을 띄울 칸이 아니다.
 * - `status: 'error'`는 `data`의 유무로 `failed`와 `degraded`로 갈린다.
 *   Query가 실패해도 같은 `queryKey`의 이전 data를 유지하기 때문이다.
 *
 * @param query - `useQuery` / `useSuspenseQuery` 결과, 또는 같은 형태의 plain object.
 * @returns 교체 층(`idle` / `loading` / `failed`) 또는 중첩 층(`ready` / `degraded`) 상태.
 *
 * @example 상태 분류
 * ```ts
 * import { toQueryState } from '@cbcruk/query-view'
 *
 * const state = toQueryState({
 *   status: 'error',
 *   error: new Error('offline'),
 *   data: [1, 2, 3],
 * })
 *
 * state.phase // 'degraded' — 보여줄 이전 결과가 남아 있다
 * ```
 */
export function toQueryState<T>(query: QueryLike<T>): QueryState<T> {
  const { status, fetchStatus = 'idle', data, error } = query
  const failureCount = query.failureCount ?? 0
  const retrying = fetchStatus === 'fetching'
  const paused = fetchStatus === 'paused'

  if (status === 'error') {
    return data !== undefined
      ? { phase: 'degraded', data, error, retrying, paused }
      : { phase: 'failed', error, retrying, paused, failureCount }
  }

  if (status === 'success') {
    return {
      phase: 'ready',
      data: data as T,
      refreshing: retrying,
      paused,
      stale: query.isStale ?? false,
      provisional: query.isPlaceholderData ?? false,
    }
  }

  return fetchStatus === 'idle'
    ? { phase: 'idle' }
    : { phase: 'loading', paused, failureCount }
}
