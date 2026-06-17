export { isSupported } from './support'

export {
  createHighlightStore,
  createCssHighlightSink,
  createNoopSink,
  defaultStore,
} from './highlight-store'

export {
  HighlightStoreProvider,
  useStore,
  useHighlight,
  useHighlightSnapshot,
  useHighlightCount,
  type HighlightStoreProviderProps,
} from './highlight-context'

export { findTextMatches } from './find-text-matches'

export { useTextMatches, useHighlightSearch } from './use-highlight-search'

export {
  Highlight,
  HighlightRoot,
  HighlightMatch,
  type HighlightRootProps,
  type HighlightMatchProps,
} from './highlight'

export { HighlightStyles } from './highlight-styles'

export type {
  HighlightSink,
  HighlightSnapshot,
  HighlightStore,
  SourceId,
  CreateHighlightStoreOptions,
  TextMatchOptions,
  UseTextMatchesOptions,
  UseHighlightSearchResult,
} from './types'
