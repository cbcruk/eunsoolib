import type { ReactNode } from 'react'
import { toQueryState } from './query-state'
import { assertNever, defaultIsEmpty } from './query-state.utils'
import { renderSlot, resolveRetry } from './query-view.utils'
import { useDelayedFlag } from './use-delayed-flag'
import { useElapsed } from './use-elapsed'
import type { QueryLike, QueryStateOf } from './types'

/**
 * 중첩 슬롯의 시그니처.
 *
 * 데코레이터라는 점이 이 라이브러리의 핵심이다. `switch`는 본질적으로 N중
 * 택1이라 "콘텐츠를 띄운 채 갱신 표시"를 표현할 수 없다.
 */
export type OverlaySlot = (content: ReactNode) => ReactNode

/** {@linkcode QueryView}의 props. */
export type QueryViewProps<T> = {
  /** `useQuery` 결과, 또는 같은 형태의 plain object. */
  query: QueryLike<T>
  /** data가 확정된 뒤의 콘텐츠. `?? []` 같은 방어가 필요 없다. */
  children: (data: T) => ReactNode

  /** 시도 이전(`enabled: false` / `skipToken`). 로딩이 아니다. */
  idle?: ReactNode
  /**
   * 첫 data를 기다리는 동안. 함수로 넘기면 경과 시간(ms)과 상태를 받는다.
   *
   * `delay` 이전에는 렌더하지 않으므로 빠른 응답에 스켈레톤이 번쩍이지 않는다.
   */
  placeholder?:
    | ReactNode
    | ((elapsed: number, state: QueryStateOf<T, 'loading'>) => ReactNode)
  /**
   * 실패했고 보여줄 data도 없을 때.
   *
   * 이전 data가 남아 있으면 이 슬롯이 아니라 {@linkcode QueryViewProps.degraded}가 쓰인다.
   */
  fallback?: (
    error: unknown,
    retry: () => void,
    state: QueryStateOf<T, 'failed'>,
  ) => ReactNode

  /** 백그라운드 재요청 중. 콘텐츠는 그대로 두고 표시만 얹는다. */
  refreshing?: OverlaySlot
  /** 오프라인 등으로 요청이 보류됨. */
  paused?: OverlaySlot
  /** 실패했지만 이전 data가 남아 있다. 흰 화면 + 에러 패널이 아니라 콘텐츠 + 배너의 자리. */
  degraded?: (
    error: unknown,
    retry: () => void,
    content: ReactNode,
  ) => ReactNode
  /** `isPlaceholderData` — 값 자체가 대역이다(`keepPreviousData` 등). 흐리게 처리하는 자리. */
  provisional?: OverlaySlot

  /**
   * 성공했지만 결과가 비었을 때. 넘기지 않으면 `children`이 그대로 렌더된다.
   *
   * 판정은 {@linkcode QueryViewProps.isEmpty}가 한다.
   */
  empty?: ReactNode | ((data: T) => ReactNode)
  /** empty 판정. 기본값은 {@linkcode defaultIsEmpty}. */
  isEmpty?: (data: T) => boolean

  /** placeholder를 띄우기까지 기다리는 시간(ms). 기본값 `200`. */
  delay?: number
  /** placeholder가 한 번 뜬 뒤 유지되는 최소 시간(ms). 기본값 `400`. */
  minDuration?: number
  /** 함수 placeholder에 넘길 경과 시간의 갱신 간격(ms). 기본값 `1000`. */
  tick?: number

  /** 생략하면 `query.refetch`를 쓴다. 캐시 무효화가 필요하면 직접 넘긴다. */
  onRetry?: () => void
}

/**
 * Query의 상태 매트릭스를 손실 없이 뷰 슬롯으로 투영한다.
 *
 * 슬롯은 두 종류로 갈린다.
 *
 * - **교체(replace)** — data가 없다. 서로를 대체한다.
 *   `idle` / `placeholder` / `fallback`
 * - **중첩(overlay)** — data가 있다. 콘텐츠를 감싼다.
 *   `provisional` / `refreshing` / `paused` / `degraded`
 *
 * 감싸는 순서는 교체 층의 포함관계를 그대로 따른다.
 *
 * ```
 * degraded ⊃ paused ⊃ refreshing ⊃ provisional ⊃ content
 * ```
 *
 * `useSuspenseQuery`를 쓴다면 교체 층이 통째로 경계로 올라가므로
 * {@linkcode AsyncBoundary}와 {@linkcode SuspenseQueryView}를 쓴다.
 *
 * @example 교체 층과 중첩 층을 함께 쓰기
 * ```tsx
 * import { QueryView } from '@cbcruk/query-view'
 *
 * <QueryView
 *   query={useQuery({ queryKey: ['posts', keyword], queryFn: fetchPosts })}
 *   idle={<p>검색어를 입력하세요</p>}
 *   placeholder={<PostSkeleton />}
 *   fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
 *   refreshing={(content) => <div aria-busy>{content}</div>}
 *   degraded={(error, retry, content) => (
 *     <>
 *       <Banner tone="warn" onRetry={retry} />
 *       {content}
 *     </>
 *   )}
 *   empty={<EmptyState keyword={keyword} />}
 * >
 *   {(posts) => <PostList posts={posts} />}
 * </QueryView>
 * ```
 *
 * 검색 결과가 이미 떠 있는데 새로고침이 실패하면 흰 화면이 아니라 기존 목록 위에
 * 배너가 얹힌다.
 */
export function QueryView<T>({
  query,
  children,
  idle = null,
  placeholder = null,
  fallback,
  refreshing,
  paused,
  degraded,
  provisional,
  empty,
  isEmpty = defaultIsEmpty as (data: T) => boolean,
  delay = 200,
  minDuration = 400,
  tick = 1000,
  onRetry,
}: QueryViewProps<T>): ReactNode {
  const state = toQueryState(query)
  const loading = state.phase === 'loading'
  const visible = useDelayedFlag(loading, { delay, minDuration })
  const elapsed = useElapsed(loading && typeof placeholder === 'function', tick)
  const retry = resolveRetry(query, onRetry)

  switch (state.phase) {
    case 'idle':
      return idle

    case 'loading':
      return visible ? renderSlot(placeholder, elapsed, state) : null

    case 'failed':
      return fallback?.(state.error, retry, state) ?? null

    case 'ready':
    case 'degraded': {
      let content: ReactNode =
        empty !== undefined && isEmpty(state.data)
          ? renderSlot(empty, state.data)
          : children(state.data)

      if (state.phase === 'ready' && state.provisional && provisional) {
        content = provisional(content)
      }

      if (state.phase === 'ready' && state.refreshing && refreshing) {
        content = refreshing(content)
      }

      if (state.paused && paused) {
        content = paused(content)
      }

      if (state.phase === 'degraded' && degraded) {
        content = degraded(state.error, retry, content)
      }

      return content
    }

    default:
      return assertNever(state)
  }
}
