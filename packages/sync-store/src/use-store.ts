import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { Store } from './create-store'

/**
 * store core를 React에 연결하는 얇은 레이어.
 *
 * 상태 구독은 전적으로 `useSyncExternalStore`에 위임하고,
 * 이 훅은 selector로 선택한 slice를 메모이즈해 불필요한 리렌더만 막는다.
 * store 자체는 React 밖의 싱글턴이므로 여러 컴포넌트가 동일한 인스턴스를 공유한다.
 */

export function useStore<T>(store: Store<T>): T
export function useStore<T, U>(
  store: Store<T>,
  selector: (state: T) => U,
  isEqual?: (a: U, b: U) => boolean,
): U
export function useStore<T, U>(
  store: Store<T>,
  selector: (state: T) => U = (state) => state as unknown as U,
  isEqual: (a: U, b: U) => boolean = Object.is,
): U {
  // 마지막으로 계산한 (원본 상태, 선택된 slice) 쌍을 렌더 간에 유지한다.
  // selector가 매번 새 참조를 만들어도 isEqual로 이전 참조를 재사용해
  // useSyncExternalStore가 무한 리렌더에 빠지지 않도록 한다.
  const lastRef = useRef<{ state: T; slice: U } | null>(null)

  const getSnapshot = useCallback(() => {
    const state = store.getState()
    const last = lastRef.current

    // 원본 상태가 그대로면 이전에 선택한 slice를 재사용한다.
    if (last && Object.is(last.state, state)) {
      return last.slice
    }

    const slice = selector(state)

    // 상태는 바뀌었지만 선택된 값이 동등하면 참조 안정성을 위해 이전 slice 유지.
    if (last && isEqual(last.slice, slice)) {
      lastRef.current = { state, slice: last.slice }

      return last.slice
    }

    lastRef.current = { state, slice }

    return slice
  }, [store, selector, isEqual])

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}
