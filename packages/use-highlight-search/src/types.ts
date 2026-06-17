export type SourceId = symbol

/**
 * name -> 등록된 Range 개수. `emit()` 시점에만 새 객체로 교체되는 안정 참조.
 * `useSyncExternalStore`가 매 호출 같은 참조를 받아야 무한 리렌더를 피한다.
 */
export type HighlightSnapshot = Readonly<Record<string, number>>

/**
 * store의 CSS 부수효과를 외부로 분리한 인터페이스.
 * 브라우저는 `CSS.highlights`에 반영하고, SSR/테스트는 no-op으로 주입한다.
 */
export interface HighlightSink {
  commit(name: string, ranges: Range[], priority: number): void
  remove(name: string): void
}

/**
 * 프레임워크 무관 코어. bookkeeping(항상 동작)과 sink(주입 가능한 부수효과)를 분리한다.
 */
export interface HighlightStore {
  setRanges(
    name: string,
    sourceId: SourceId,
    ranges: Range[],
    priority?: number,
  ): void
  remove(name: string, sourceId: SourceId): void
  subscribe(listener: () => void): () => void
  getSnapshot(): HighlightSnapshot
  getServerSnapshot(): HighlightSnapshot
  getRanges(name: string): Range[]
}

export interface CreateHighlightStoreOptions {
  sink?: HighlightSink
}

export interface TextMatchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
}

export interface UseTextMatchesOptions extends TextMatchOptions {
  /** DOM 변동을 MutationObserver로 추적할지 여부. 기본 true. */
  observe?: boolean
}

export interface UseHighlightSearchResult {
  count: number
  /** 매치가 없으면 -1. */
  active: number
  next(): void
  prev(): void
}
