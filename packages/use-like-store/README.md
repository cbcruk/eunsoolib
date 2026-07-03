# @eunsoolib/use-like-store

찜 목록 상태 관리 유틸리티. **framework-agnostic 싱글턴 core + `useSyncExternalStore` React 레이어** 패턴을 따른다.

- **core**: `@eunsoolib/sync-store`의 `createStore`로 만든 싱글턴(`likeStore`). React를 모르므로 단독 테스트/재사용 가능.
- **도메인 액션**: core를 얇게 유지하기 위해 store 밖에서 정의(`likeActions`).
- **React 레이어**: `useStore`(→ `useSyncExternalStore`) 기반의 `useLikes` / `useIsLiked`.

## 사용법

### core / 액션 (React 밖)

```ts
import { likeStore, likeActions } from '@eunsoolib/use-like-store'

likeActions.add({ id: 1, name: '상품1', image: 'a.jpg', price: 1000 })
likeActions.toggle(item) // 있으면 제거, 없으면 추가
likeActions.has(1) // true
likeStore.getState() // Item[]
```

### React

```tsx
import { useLikes, useIsLiked, likeActions } from '@eunsoolib/use-like-store'

function LikeButton({ item }: { item: Item }) {
  const liked = useIsLiked(item.id) // 해당 아이템 찜 여부만 구독
  return (
    <button onClick={() => likeActions.toggle(item)}>
      {liked ? '♥' : '♡'}
    </button>
  )
}

function LikeCount() {
  const count = useLikes((items) => items.length) // 파생 값만 구독
  return <span>{count}</span>
}
```

## API

- `likeStore` — `createStore<Item[]>` 싱글턴 core (`getState` / `setState` / `subscribe`)
- `likeActions` — `has` / `add` / `remove` / `removeMany` / `toggle` / `clear`
- `useLikes<U>(selector?)` — 전체 목록 또는 selector로 파생 값을 구독
- `useIsLiked(id)` — 특정 아이템의 찜 여부만 구독
- `ItemSchema` / `Item` / `LikeItemId` — 아이템 타입 (zod)
