import { createStore } from './create-store'

/**
 * 싱글턴 core 사용 예시.
 *
 * store 인스턴스는 모듈 스코프에 한 번만 생성되어 앱 전역에서 공유된다.
 * 도메인 동작은 `actions`처럼 store 밖에서 정의해 core를 얇게 유지한다.
 */

export interface CounterState {
  count: number
}

export const counterStore = createStore<CounterState>({ count: 0 })

export const counterActions = {
  increment: () => counterStore.setState((prev) => ({ count: prev.count + 1 })),
  decrement: () => counterStore.setState((prev) => ({ count: prev.count - 1 })),
  reset: () => counterStore.setState(counterStore.getInitialState()),
}

// React 컴포넌트에서는 아래처럼 바인딩한다.
//
//   const count = useStore(counterStore, (state) => state.count)
//   return <button onClick={counterActions.increment}>{count}</button>
