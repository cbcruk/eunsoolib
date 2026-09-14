import { useStore } from '@cbcruk/sync-store'
import { likeStore } from './like-store'
import type { Item, LikeItemId } from './like-item'

/**
 * 찜 목록 core를 React에 연결하는 얇은 레이어.
 * 구독/스냅샷은 sync-store의 `useStore`(→ `useSyncExternalStore`)에 위임한다.
 */
export function useLikes<U = Item[]>(
  selector: (items: Item[]) => U = (items) => items as unknown as U,
): U {
  return useStore(likeStore, selector)
}

/** 특정 아이템의 찜 여부만 구독한다. */
export function useIsLiked(id: LikeItemId): boolean {
  return useStore(likeStore, (items) => items.some((item) => item.id === id))
}
