import type { ReactNode } from 'react'

/** {@linkcode Collection}의 props. */
export type CollectionProps<T> = {
  /** 렌더할 목록. */
  items: readonly T[]
  /** 목록이 비어 있지 않을 때의 콘텐츠. */
  children: (items: readonly T[]) => ReactNode
  /** 목록이 비었을 때. 기본값은 아무것도 렌더하지 않음. */
  empty?: ReactNode
}

/**
 * `empty` 슬롯만 단독으로 쓴다.
 *
 * Query와 무관하게 이미 손에 쥔 배열을 렌더할 때를 위한 컴포넌트다. "결과가
 * 비었다"는 판정은 데이터를 본 쪽만 할 수 있어 경계 컴포넌트로 올라갈 수 없고,
 * 그래서 이 한 조각만 따로 남는다.
 *
 * @example 이미 받은 목록 렌더하기
 * ```tsx
 * import { Collection } from '@eunsoolib/query-view'
 *
 * <Collection items={posts} empty={<p>아직 글이 없습니다</p>}>
 *   {(items) => <PostList posts={items} />}
 * </Collection>
 * ```
 */
export function Collection<T>({
  items,
  children,
  empty = null,
}: CollectionProps<T>): ReactNode {
  return items.length === 0 ? empty : children(items)
}
