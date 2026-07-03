import { createStore } from '@eunsoolib/sync-store'
import type { Item, LikeItemId } from './like-item'

/**
 * 찜 목록 상태를 담는 framework-agnostic 싱글턴 core.
 *
 * 상태는 sync-store의 `createStore`로 관리하고, React 바인딩은
 * `use-like-store.ts`에서 `useSyncExternalStore`로 얹는다.
 */
export const likeStore = createStore<Item[]>([])

const hasItem = (items: Item[], id: LikeItemId) =>
  items.some((item) => item.id === id)

/**
 * 도메인 액션은 core를 얇게 유지하기 위해 store 밖에서 정의한다.
 * 중복 추가 등 상태가 바뀌지 않는 경우엔 동일 참조를 반환해
 * `setState`의 `Object.is` 가드가 불필요한 알림을 건너뛰게 한다.
 */
export const likeActions = {
  has: (id: LikeItemId) => hasItem(likeStore.getState(), id),

  add: (item: Item) =>
    likeStore.setState((items) =>
      hasItem(items, item.id) ? items : [...items, item],
    ),

  remove: (id: LikeItemId) =>
    likeStore.setState((items) => items.filter((item) => item.id !== id)),

  removeMany: (ids: LikeItemId[]) =>
    likeStore.setState((items) =>
      items.filter((item) => !ids.includes(item.id)),
    ),

  toggle: (item: Item) =>
    likeStore.setState((items) =>
      hasItem(items, item.id)
        ? items.filter((it) => it.id !== item.id)
        : [...items, item],
    ),

  clear: () => likeStore.setState([]),
}
