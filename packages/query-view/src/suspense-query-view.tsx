import type { ReactNode } from 'react'
import { QueryView, type QueryViewProps } from './query-view'
import { isDev } from './query-view.utils'

/**
 * {@linkcode SuspenseQueryView}의 props.
 *
 * `useSuspenseQuery`는 `pending`도 `error`도 반환하지 않는다 — 둘 다 경계로
 * 올라간다. 그래서 교체 층 슬롯과 그 시간 정책이 타입에서 통째로 제거된다.
 */
export type SuspenseQueryViewProps<T> = Omit<
  QueryViewProps<T>,
  'idle' | 'placeholder' | 'fallback' | 'delay' | 'minDuration' | 'tick'
>

/**
 * `useSuspenseQuery` 전용 뷰. 중첩 층 슬롯과 `empty`만 받는다.
 *
 * 교체 층은 {@linkcode AsyncBoundary}가 맡는다. 경계와 뷰는 경쟁 관계가 아니라
 * 층으로 갈린다.
 *
 * ```
 * AsyncBoundary(실패 ⊃ 지연) ⊃ SuspenseQueryView(빈 결과 ⊃ 중첩 ⊃ 콘텐츠)
 * ```
 *
 * `empty`만 경계로 올라가지 못하는 것도 같은 원리다. "결과가 비었다"는 판정은
 * data를 본 쪽만 할 수 있으므로 가장 안쪽에 남는다.
 *
 * 개발 빌드에서는 교체 층 상태가 들어오면 경고한다 — `useSuspenseQuery`가 아니라
 * `useQuery`를 넘긴 경우를 잡는다.
 *
 * @example 경계와 짝지어 쓰기
 * ```tsx
 * import { AsyncBoundary, Delayed, SuspenseQueryView } from '@cbcruk/query-view'
 *
 * <AsyncBoundary
 *   placeholder={<Delayed><PostSkeleton /></Delayed>}
 *   fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
 * >
 *   <SuspenseQueryView query={useSuspenseQuery(options)} empty={<EmptyState />}>
 *     {(posts) => <PostList posts={posts} />}
 *   </SuspenseQueryView>
 * </AsyncBoundary>
 * ```
 */
export function SuspenseQueryView<T>(
  props: SuspenseQueryViewProps<T>,
): ReactNode {
  if (isDev) {
    const { status, data } = props.query

    if (status === 'pending' || (status === 'error' && data === undefined)) {
      console.error(
        '[SuspenseQueryView] received a replace-layer state (%s). ' +
          'This looks like a useQuery result — use QueryView instead, ' +
          'or move the replace layer to an <AsyncBoundary>.',
        status,
      )
    }
  }

  return <QueryView {...props} />
}
