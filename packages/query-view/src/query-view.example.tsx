/**
 * 사용 예제. 제네릭 추론과 두 경로의 역할 분담을 코드로 확인하는 용도다.
 *
 * 런타임 의존성이 생기지 않도록 `@tanstack/react-query`를 import하지 않고,
 * 실제 `UseQueryResult`와 구조적으로 호환되는 형태만 흉내낸다.
 *
 * @module
 */
import type { ReactNode } from 'react'
import { AsyncBoundary } from './async-boundary'
import { Collection } from './collection'
import { Delayed } from './delayed'
import { QueryView } from './query-view'
import { SuspenseQueryView } from './suspense-query-view'
import type { QueryLike } from './types'

type Post = { id: string; title: string }

declare function useQuery<T>(key: unknown[]): QueryLike<T>
declare function useSuspenseQuery<T>(key: unknown[]): QueryLike<T> & { data: T }

declare const PostList: (props: { posts: readonly Post[] }) => ReactNode
declare const PostSkeleton: () => ReactNode
declare const ErrorPanel: (props: {
  error: unknown
  onRetry: () => void
  disabled?: boolean
}) => ReactNode
declare const EmptyState: (props: { keyword: string }) => ReactNode
declare const Banner: (props: {
  tone: 'warn' | 'info'
  children: ReactNode
}) => ReactNode
declare const Spinner: () => ReactNode

/** `useQuery` 경로. 매트릭스 전체가 컴포넌트 안에 있다. */
export function PostsPage({ keyword }: { keyword: string }): ReactNode {
  const query = useQuery<Post[]>(['posts', keyword])

  return (
    <QueryView
      query={query}
      idle={<p>검색어를 입력하세요</p>}
      placeholder={(elapsed, state) =>
        state.paused ? (
          <p>오프라인입니다. 연결되면 이어서 불러옵니다</p>
        ) : elapsed > 5000 ? (
          <p>응답이 늦어지고 있습니다</p>
        ) : (
          <PostSkeleton />
        )
      }
      fallback={(error, retry, state) => (
        <ErrorPanel error={error} onRetry={retry} disabled={state.retrying} />
      )}
      refreshing={(content) => (
        <div style={{ position: 'relative' }}>
          {content}
          <Spinner />
        </div>
      )}
      paused={(content) => (
        <>
          <Banner tone="info">오프라인 — 저장된 내용입니다</Banner>
          {content}
        </>
      )}
      degraded={(_error, retry, content) => (
        <>
          <Banner tone="warn">
            새로고침에 실패했습니다 <button onClick={retry}>다시 시도</button>
          </Banner>
          {content}
        </>
      )}
      provisional={(content) => <div style={{ opacity: 0.5 }}>{content}</div>}
      empty={<EmptyState keyword={keyword} />}
    >
      {(posts) => <PostList posts={posts} />}
    </QueryView>
  )
}

/** `useSuspenseQuery` 경로. 교체 층이 통째로 경계로 올라간다. */
export function PostsRoute({ keyword }: { keyword: string }): ReactNode {
  return (
    <AsyncBoundary
      placeholder={
        <Delayed>
          <PostSkeleton />
        </Delayed>
      }
      fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
      resetKeys={[keyword]}
      onReset={() => {
        // queryClient.resetQueries({ queryKey: ['posts'] })
      }}
    >
      <PostsPanel keyword={keyword} />
    </AsyncBoundary>
  )
}

/** 남은 슬롯이 중첩 층과 `empty`뿐이다. 교체 층은 타입에서 제거되어 있다. */
function PostsPanel({ keyword }: { keyword: string }): ReactNode {
  const query = useSuspenseQuery<Post[]>(['posts', keyword])

  return (
    <SuspenseQueryView
      query={query}
      refreshing={(content) => <div aria-busy>{content}</div>}
      paused={(content) => (
        <>
          <Banner tone="info">오프라인</Banner>
          {content}
        </>
      )}
      empty={<EmptyState keyword={keyword} />}
    >
      {(posts) => <PostList posts={posts} />}
    </SuspenseQueryView>
  )
}

/** `empty`만 단독으로 쓰는 경우. */
export function InlinePosts({ posts }: { posts: readonly Post[] }): ReactNode {
  return (
    <Collection items={posts} empty={<p>아직 글이 없습니다</p>}>
      {(items) => <PostList posts={items} />}
    </Collection>
  )
}
