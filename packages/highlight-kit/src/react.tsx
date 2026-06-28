/**
 * @highlight-kit/react
 *
 * Thin React adapter over the singleton core.
 *   - reactive reads via useSyncExternalStore (SSR-safe)
 *   - each component instance is a distinct "source" via useId
 *   - declarative <Highlight> wraps the headless useHighlight hook
 */

import {
  createElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react'
import {
  highlights,
  computeRanges,
  isHighlightSupported,
  type HighlightSnapshot,
  type MatchOptions,
} from './core'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** Read-only reactive subscription to one highlight name's state. */
export function useHighlightState(name: string): HighlightSnapshot {
  return useSyncExternalStore(
    highlights.subscribe,
    () => highlights.getSnapshot(name),
    highlights.getServerSnapshot,
  )
}

/** Whether the Custom Highlight API is available (false during SSR). */
export function useHighlightSupport(): boolean {
  return useSyncExternalStore(
    // support never changes at runtime, so a no-op unsubscribe is fine.
    () => () => {},
    () => isHighlightSupported(),
    () => false,
  )
}

export interface UseHighlightOptions extends MatchOptions {
  /** The text/regex to highlight. Falsy clears this source. */
  query: string | RegExp
  /** CSS ::highlight() name. Defaults to a unique per-instance name. */
  name?: string
}

export interface UseHighlightResult<
  T extends Element = HTMLElement,
> extends HighlightSnapshot {
  /** Attach to the element whose text you want to scan. */
  ref: Ref<T>
  /** The resolved highlight name (auto-generated if not provided). */
  name: string
}

/**
 * Headless highlighting. Attach the returned `ref` to any container; the hook
 * keeps that container's matches for `query` registered under `name`, and
 * reconciles on every change. Cleans up its own contribution on unmount.
 */
export function useHighlight<T extends Element = HTMLElement>(
  options: UseHighlightOptions,
): UseHighlightResult<T> {
  const { query, caseSensitive, wholeWord } = options
  const autoId = useId()
  const name = options.name ?? `hk-${autoId}`
  const sourceId = autoId // stable, unique per component instance

  const ref = useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el || !query) {
      highlights.remove(name, sourceId)
      return
    }
    highlights.set(
      name,
      sourceId,
      computeRanges(el, query, { caseSensitive, wholeWord }),
    )
    return () => highlights.remove(name, sourceId)
    // Re-run when the target name, query, or match options change.
    // NOTE: changing the container's text alone won't retrigger this — see
    // the docs on MutationObserver if you need that.
  }, [name, sourceId, query, caseSensitive, wholeWord])

  const state = useHighlightState(name)
  return { ref, name, ...state }
}

// ---------------------------------------------------------------------------
// Declarative component
// ---------------------------------------------------------------------------

export interface HighlightProps extends MatchOptions {
  query: string | RegExp
  name?: string
  /** Element to render as the scan container (default: 'div'). */
  as?: ElementType
  children?: ReactNode
  /** Tip: pass style={{ display: 'contents' }} for zero layout impact. */
  className?: string
  style?: CSSProperties
}

/**
 * <Highlight query="foo" name="search">…</Highlight>
 *
 * Renders a single wrapper element and highlights matches of `query` within it.
 * Multiple <Highlight> sharing the same `name` are unioned by the core, so one
 * ::highlight(name) CSS rule styles them all.
 */
export function Highlight({
  query,
  name,
  as = 'div',
  caseSensitive,
  wholeWord,
  children,
  ...rest
}: HighlightProps) {
  const { ref } = useHighlight<HTMLElement>({
    query,
    name,
    caseSensitive,
    wholeWord,
  })
  return createElement(as, { ref, ...rest }, children)
}

export { highlights } from './core'
