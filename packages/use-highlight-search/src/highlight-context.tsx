import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createHighlightStore, defaultStore } from './highlight-store'
import type { HighlightSnapshot, HighlightStore, SourceId } from './types'

const StoreContext = createContext<HighlightStore>(defaultStore)

export function useStore(): HighlightStore {
  return useContext(StoreContext)
}

export interface HighlightStoreProviderProps {
  /** 생략하면 Provider 내부에서 격리된 store를 한 번만 생성한다. */
  store?: HighlightStore
  children?: ReactNode
}

export function HighlightStoreProvider({
  store,
  children,
}: HighlightStoreProviderProps): ReactNode {
  const fallback = useRef<HighlightStore | null>(null)
  if (!store && fallback.current === null) {
    fallback.current = createHighlightStore()
  }
  const value = store ?? fallback.current!
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/**
 * Range 등록은 리렌더가 필요 없는 부수효과이므로 `useLayoutEffect`에서만 수행한다.
 * `sourceId`는 StrictMode 이중 실행에도 안정적이도록 `useRef`로 lazy init한다.
 */
export function useHighlight(
  name: string,
  ranges: Range[],
  priority = 0,
): void {
  const store = useStore()
  const sidRef = useRef<SourceId | null>(null)
  if (sidRef.current === null) sidRef.current = Symbol(name)

  useLayoutEffect(() => {
    const id = sidRef.current!
    store.setRanges(name, id, ranges, priority)
    return () => store.remove(name, id)
  }, [store, name, ranges, priority])
}

export function useHighlightSnapshot(): HighlightSnapshot {
  const store = useStore()
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}

export function useHighlightCount(name: string): number {
  return useHighlightSnapshot()[name] ?? 0
}
