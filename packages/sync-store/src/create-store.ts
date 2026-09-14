/** 상태가 바뀔 때 인자 없이 호출되는 구독 콜백. */
export type Listener = () => void

/** 다음 상태를 값 또는 이전 상태를 받는 함수로 전달할 수 있다. */
export type Updater<T> = T | ((prev: T) => T)

/**
 * 프레임워크에 의존하지 않는 store core.
 *
 * React 등 특정 UI 레이어를 몰라도 동작하는 싱글턴 상태 컨테이너다.
 * `getState` / `setState` / `subscribe` 원시 연산만 제공하며,
 * React 바인딩(`useStore`)은 이 core 위에 `useSyncExternalStore`로 얹는다.
 *
 * @template T - 상태 타입
 */
export interface Store<T> {
  /** 현재 상태를 반환한다. */
  getState: () => T
  /** store 생성 시점의 초기 상태를 반환한다. (reset 등에 사용) */
  getInitialState: () => T
  /**
   * 상태를 갱신한다. 함수형 updater를 지원하며,
   * `Object.is` 기준으로 값이 동일하면 listener를 호출하지 않는다.
   */
  setState: (updater: Updater<T>) => void
  /**
   * 상태 변경 구독을 등록하고, 구독 해제 함수를 반환한다.
   * `useSyncExternalStore`의 `subscribe` 인자와 호환된다.
   */
  subscribe: (listener: Listener) => () => void
}

function isUpdaterFn<T>(updater: Updater<T>): updater is (prev: T) => T {
  return typeof updater === 'function'
}

/**
 * 싱글턴 store를 생성한다.
 *
 * @example
 * ```ts
 * import { createStore } from '@cbcruk/sync-store'
 *
 * const counter = createStore({ count: 0 })
 * counter.subscribe(() => console.log(counter.getState()))
 * counter.setState((prev) => ({ count: prev.count + 1 })) // { count: 1 }
 * ```
 */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  const getState = () => state

  const getInitialState = () => initialState

  const setState: Store<T>['setState'] = (updater) => {
    const next = isUpdaterFn(updater) ? updater(state) : updater

    if (Object.is(next, state)) {
      return
    }

    state = next
    listeners.forEach((listener) => listener())
  }

  const subscribe: Store<T>['subscribe'] = (listener) => {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }

  return { getState, getInitialState, setState, subscribe }
}
