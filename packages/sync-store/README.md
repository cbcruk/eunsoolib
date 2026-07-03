# @eunsoolib/sync-store

프레임워크에 의존하지 않는 싱글턴 store core와, 그 위에 얇게 얹는 React `useSyncExternalStore` 레이어.

## 배경

최근 라이브러리들은 `react-*`로 core를 설계하지 않고, UI 프레임워크를 모르는 순수한 core(싱글턴 store)를 먼저 만든 뒤 `useSyncExternalStore` 같은 얇은 어댑터로 React에 연결하는 경우가 많습니다. 이렇게 하면:

- **core를 React 없이 테스트**할 수 있고 (아래 `createStore` 테스트 참고)
- 동일한 core를 **React가 아닌 환경(바닐라 JS, 다른 프레임워크)에서도 재사용**할 수 있으며
- 구독/스냅샷 처리는 React가 공식 지원하는 `useSyncExternalStore`에 위임해 **tearing 없이 안전**합니다.

이 패키지는 그 패턴의 최소 구현입니다.

## 구성

| 파일              | 레이어                    | 역할                                                   |
| ----------------- | ------------------------- | ------------------------------------------------------ |
| `create-store.ts` | core (framework-agnostic) | `getState` / `setState` / `subscribe` 싱글턴 store     |
| `use-store.ts`    | React                     | `useSyncExternalStore` 기반 바인딩 + selector 메모이즈 |

## 사용법

### 1. core: 싱글턴 store 정의

```ts
import { createStore } from '@eunsoolib/sync-store'

interface CounterState {
  count: number
}

// 모듈 스코프에 한 번만 생성 → 앱 전역 싱글턴
export const counterStore = createStore<CounterState>({ count: 0 })

// 도메인 동작은 core 밖에서 정의해 store를 얇게 유지
export const counterActions = {
  increment: () => counterStore.setState((prev) => ({ count: prev.count + 1 })),
  reset: () => counterStore.setState(counterStore.getInitialState()),
}
```

`createStore`는 React를 전혀 모르므로 순수 함수처럼 단독으로 쓰거나 테스트할 수 있습니다.

```ts
counterStore.subscribe(() => console.log(counterStore.getState()))
counterActions.increment() // { count: 1 }
```

### 2. React: `useStore`로 바인딩

```tsx
import { useStore } from '@eunsoolib/sync-store'
import { counterStore, counterActions } from './counter-store'

function Counter() {
  // selector로 필요한 slice만 구독한다.
  const count = useStore(counterStore, (state) => state.count)

  return <button onClick={counterActions.increment}>{count}</button>
}
```

selector를 생략하면 전체 상태를 구독합니다.

```tsx
const state = useStore(counterStore) // CounterState
```

### selector와 리렌더 제어

selector가 매 렌더마다 새 참조를 만들어도, 이전에 선택한 값과 `isEqual`(기본 `Object.is`)로 비교해 동등하면 리렌더하지 않습니다.

```tsx
// 세 번째 인자로 커스텀 비교 함수를 넘길 수 있다.
const ids = useStore(
  todoStore,
  (state) => state.todos.map((t) => t.id),
  (a, b) => a.length === b.length && a.every((id, i) => id === b[i]),
)
```

## API

### `createStore<T>(initialState: T): Store<T>`

- `getState(): T` — 현재 상태
- `getInitialState(): T` — 생성 시점의 초기 상태 (reset 등에 사용)
- `setState(updater: T | ((prev: T) => T)): void` — 상태 갱신. `Object.is` 기준으로 값이 같으면 알림을 건너뜀
- `subscribe(listener: () => void): () => void` — 구독 등록, 해제 함수 반환

### `useStore<T>(store)` / `useStore<T, U>(store, selector, isEqual?)`

`useSyncExternalStore`로 store를 구독한다. `selector`로 slice를 선택하고 `isEqual`로 리렌더 조건을 제어한다.
