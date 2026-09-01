import type { QueryState } from './types'

/**
 * data를 들고 있는 phase인지 좁힌다.
 *
 * 교체 층과 중첩 층을 가르는 판정이 곧 이 함수다.
 *
 * @param state 분류된 상태.
 * @returns `ready` 또는 `degraded`이면 `true`.
 *
 * @example 상태에서 data 꺼내기
 * ```ts
 * import { hasData, toQueryState } from '@eunsoolib/query-view'
 *
 * const state = toQueryState(query)
 * const items = hasData(state) ? state.data : []
 * ```
 */
export function hasData<T>(
  state: QueryState<T>,
): state is Extract<QueryState<T>, { data: T }> {
  return state.phase === 'ready' || state.phase === 'degraded'
}

/**
 * 기본 empty 판정.
 *
 * 배열 · 문자열은 `length`, {@linkcode Map} · {@linkcode Set}은 `size`,
 * `null` · `undefined`는 비었다고 본다. 키 없는 plain object는 일부러 다루지
 * 않는다 — `{}`가 빈 결과인지 필드가 전부 optional인 유효 응답인지는 도메인만
 * 안다. 그런 경우엔 `isEmpty` prop으로 직접 넘긴다.
 *
 * @param value 판정할 값.
 * @returns 빈 결과로 볼 수 있으면 `true`.
 */
export function defaultIsEmpty(value: unknown): boolean {
  if (value == null) return true
  if (Array.isArray(value) || typeof value === 'string')
    return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  return false
}

/**
 * 취소된 요청의 에러인지 판별한다.
 *
 * 취소는 실패가 아니다. 라우트 이동이나 `AbortController`로 끊긴 요청을
 * `fallback` / `degraded`에서 에러 패널로 올리지 않으려면 슬롯 안에서 이 함수로
 * 걸러낸다. {@linkcode toQueryState}는 이 판별을 자동으로 적용하지 않는다 —
 * 취소를 어떻게 대우할지는 화면마다 다르기 때문이다.
 *
 * `DOMException`뿐 아니라 `name`이 `AbortError`인 모든 에러를 인정한다.
 * 취소를 표현하는 관례가 라이브러리마다 다르기 때문이다.
 *
 * @param error 검사할 값.
 * @returns 취소로 볼 수 있으면 `true`.
 *
 * @example 취소를 에러 패널에서 제외하기
 * ```tsx
 * import { QueryView, isAbortError } from '@eunsoolib/query-view'
 *
 * <QueryView
 *   query={query}
 *   fallback={(error, retry) =>
 *     isAbortError(error) ? null : <ErrorPanel error={error} onRetry={retry} />
 *   }
 * >
 *   {(posts) => <PostList posts={posts} />}
 * </QueryView>
 * ```
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/**
 * 도달할 수 없는 분기임을 타입으로 강제한다.
 *
 * {@linkcode QueryState}에 phase가 추가되면 이 호출이 컴파일 에러가 되어
 * 처리를 빠뜨린 자리를 알려준다.
 *
 * @param value 남은 케이스. 모든 phase를 처리했다면 `never`로 좁혀진다.
 * @returns 반환하지 않는다. 항상 던진다.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled query phase: ${JSON.stringify(value)}`)
}
