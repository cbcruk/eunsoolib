/**
 * @highlight-kit/react
 *
 * Thin React adapter over the core controller.
 *   - reactive reads via useSyncExternalStore (SSR-safe)
 *   - each component instance is a distinct "source" via useId
 *   - writes happen in layout effects only; reads never trigger writes
 *   - declarative <Highlight> / <Highlight.Root> wrap the headless hooks
 */

import {
  createContext,
  createElement,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  highlights,
  computeRanges,
  createHighlightController,
  generateHighlightCSS,
  isHighlightSupported,
  type HighlightController,
  type HighlightSnapshot,
  type MatchOptions,
} from './core'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

// ---------------------------------------------------------------------------
// Controller injection
// ---------------------------------------------------------------------------

const ControllerContext = createContext<HighlightController>(highlights)

/** The controller in scope — the shared singleton unless a provider overrides it. */
export function useHighlightController(): HighlightController {
  return useContext(ControllerContext)
}

export interface HighlightProviderProps {
  /** Omit to create an isolated controller once for this provider. */
  controller?: HighlightController
  children?: ReactNode
}

/**
 * Scope hooks below to a specific controller. Mostly for tests (inject one
 * built with `createNoopSink()`); highlight *names* remain document-global.
 */
export function HighlightProvider({
  controller,
  children,
}: HighlightProviderProps): ReactNode {
  const fallback = useRef<HighlightController | null>(null)
  if (!controller && fallback.current === null) {
    fallback.current = createHighlightController()
  }
  return (
    <ControllerContext.Provider value={controller ?? fallback.current!}>
      {children}
    </ControllerContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Read-only reactive subscription to one highlight name's state. */
export function useHighlightState(name: string): HighlightSnapshot {
  const controller = useHighlightController()
  return useSyncExternalStore(
    controller.subscribe,
    () => controller.getSnapshot(name),
    controller.getServerSnapshot,
  )
}

/** Read-only reactive subscription to every active name's state. */
export function useHighlightSnapshots(): Readonly<
  Record<string, HighlightSnapshot>
> {
  const controller = useHighlightController()
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshots,
    controller.getServerSnapshots,
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

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Register precomputed `ranges` under `name` for this component instance.
 * Effect-only: re-registers whenever the `ranges` reference changes and removes
 * its contribution on unmount.
 */
export function useHighlightRanges(
  name: string,
  ranges: Range[],
  priority = 0,
): void {
  const controller = useHighlightController()
  const sourceId = useId()

  useIsomorphicLayoutEffect(() => {
    controller.set(name, sourceId, ranges, priority)
    return () => controller.remove(name, sourceId)
  }, [controller, name, sourceId, ranges, priority])
}

export interface TextMatchOptions extends MatchOptions {
  /** Recompute when the container's DOM changes (MutationObserver). */
  observe?: boolean
}

/**
 * Track the ranges matching `pattern` inside `target` (a ref or an element).
 * With `observe` (default true) child/text mutations trigger a recompute.
 *
 * Pass the element itself when it is owned by a *parent* component: a parent's
 * ref is attached only after its children's layout effects have run.
 */
export function useTextMatches(
  target: RefObject<Element | null> | Element | null,
  pattern: string | RegExp,
  options: TextMatchOptions = {},
): Range[] {
  const { caseSensitive, wholeWord, observe = true } = options
  const [ranges, setRanges] = useState<Range[]>([])

  useIsomorphicLayoutEffect(() => {
    const el = target && 'current' in target ? target.current : target
    if (!el) return
    const compute = (): void =>
      setRanges(computeRanges(el, pattern, { caseSensitive, wholeWord }))
    compute()
    if (!observe) return
    const observer = new MutationObserver(compute)
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => observer.disconnect()
  }, [target, pattern, caseSensitive, wholeWord, observe])

  return ranges
}

export interface UseHighlightOptions extends MatchOptions {
  /** The text/regex to highlight. Falsy clears this source. */
  query: string | RegExp
  /** CSS ::highlight() name. Defaults to a unique per-instance name. */
  name?: string
  /** Stacking order against other highlight names (default: 0). */
  priority?: number
  /** Recompute when the container's DOM changes (default: false). */
  observe?: boolean
}

export interface UseHighlightResult<
  T extends Element = HTMLElement,
> extends HighlightSnapshot {
  /** Attach to the element whose text you want to scan. */
  ref: RefObject<T | null>
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
  const { query, caseSensitive, wholeWord, priority = 0, observe } = options
  const controller = useHighlightController()
  const autoId = useId()
  const name = options.name ?? `hk-${autoId}`
  const sourceId = autoId // stable, unique per component instance

  const ref = useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el || !query) {
      controller.remove(name, sourceId)
      return
    }
    const register = (): void =>
      controller.set(
        name,
        sourceId,
        computeRanges(el, query, { caseSensitive, wholeWord }),
        priority,
      )
    register()

    const observer = observe ? new MutationObserver(register) : null
    observer?.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer?.disconnect()
      controller.remove(name, sourceId)
    }
  }, [
    controller,
    name,
    sourceId,
    query,
    caseSensitive,
    wholeWord,
    priority,
    observe,
  ])

  const state = useHighlightState(name)
  return { ref, name, ...state }
}

export interface UseHighlightSearchOptions extends TextMatchOptions {
  /**
   * Base highlight name (default: 'search'). The active match is registered
   * under `${name}-current` with a higher priority.
   */
  name?: string
}

export interface UseHighlightSearchResult {
  count: number
  /** Index of the active match, or -1 when there are no matches. */
  active: number
  next(): void
  prev(): void
}

/**
 * Search with next/prev navigation. All matches go to `name`, the active one to
 * `${name}-current`, and the active match is scrolled into view.
 */
export function useHighlightSearch(
  containerRef: RefObject<Element | null>,
  query: string | RegExp,
  options: UseHighlightSearchOptions = {},
): UseHighlightSearchResult {
  const { name = 'search', ...matchOptions } = options
  const matches = useTextMatches(containerRef, query, matchOptions)
  const [active, setActive] = useState(0)

  useIsomorphicLayoutEffect(() => {
    setActive((a) =>
      matches.length === 0 ? 0 : Math.min(a, matches.length - 1),
    )
  }, [matches])

  const activeRange = useMemo<Range[]>(
    () => (matches[active] ? [matches[active]] : []),
    [matches, active],
  )

  useHighlightRanges(name, matches, 0)
  useHighlightRanges(`${name}-current`, activeRange, 1)

  useEffect(() => {
    const el = matches[active]?.startContainer?.parentElement
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [matches, active])

  const { count } = useHighlightState(name)
  const next = useCallback(
    () => setActive((a) => (matches.length ? (a + 1) % matches.length : 0)),
    [matches.length],
  )
  const prev = useCallback(
    () =>
      setActive((a) =>
        matches.length ? (a - 1 + matches.length) % matches.length : 0,
      ),
    [matches.length],
  )

  return { count, active: matches.length ? active : -1, next, prev }
}

// ---------------------------------------------------------------------------
// Declarative components
// ---------------------------------------------------------------------------

export interface HighlightProps extends MatchOptions {
  query: string | RegExp
  name?: string
  priority?: number
  observe?: boolean
  /** Element to render as the scan container (default: 'div'). */
  as?: ElementType
  children?: ReactNode
  /** Tip: pass style={{ display: 'contents' }} for zero layout impact. */
  className?: string
  style?: CSSProperties
}

function HighlightComponent({
  query,
  name,
  priority,
  observe,
  as = 'div',
  caseSensitive,
  wholeWord,
  children,
  ...rest
}: HighlightProps): ReactNode {
  const { ref } = useHighlight<HTMLElement>({
    query,
    name,
    priority,
    observe,
    caseSensitive,
    wholeWord,
  })
  return createElement(as, { ref, ...rest }, children)
}

interface HighlightRootContextValue {
  name: string
  container: HTMLElement | null
}

const HighlightRootContext = createContext<HighlightRootContextValue | null>(
  null,
)

export interface HighlightRootProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  /** Default highlight name for nested <Highlight.Match> without `name`. */
  name: string
  as?: ElementType
  children?: ReactNode
}

/** Scan container for one or more <Highlight.Match> children. */
export const HighlightRoot = forwardRef<HTMLElement, HighlightRootProps>(
  function HighlightRoot({ name, as = 'div', children, ...rest }, ref) {
    // State (not a ref) so nested Match effects re-run once the element exists.
    const [container, setContainer] = useState<HTMLElement | null>(null)
    useImperativeHandle(ref, () => container as HTMLElement, [container])
    const ctx = useMemo<HighlightRootContextValue>(
      () => ({ name, container }),
      [name, container],
    )
    return (
      <HighlightRootContext.Provider value={ctx}>
        {createElement(as, { ref: setContainer, ...rest }, children)}
      </HighlightRootContext.Provider>
    )
  },
)

export interface HighlightMatchProps extends TextMatchOptions {
  pattern: string | RegExp
  /** Falls back to the enclosing Root's `name`. */
  name?: string
  priority?: number
}

/**
 * Effect-only: renders nothing, scans the enclosing Root's container and
 * registers the matches. Tracks DOM changes by default (`observe`).
 */
export function HighlightMatch({
  pattern,
  name,
  priority = 0,
  ...matchOptions
}: HighlightMatchProps): null {
  const ctx = useContext(HighlightRootContext)
  if (!ctx) {
    throw new Error('<Highlight.Match> must be used inside <Highlight.Root>')
  }
  const ranges = useTextMatches(ctx.container, pattern, matchOptions)
  useHighlightRanges(name ?? ctx.name, ranges, priority)
  return null
}

/**
 * <Highlight query="foo" name="search">…</Highlight>
 *
 * Renders a single wrapper element and highlights matches of `query` within it.
 * Multiple <Highlight> sharing the same `name` are unioned by the core, so one
 * ::highlight(name) CSS rule styles them all.
 *
 * For several patterns over one container use the compound form:
 * <Highlight.Root name="log"><Highlight.Match pattern={/ERROR.*\/} /></Highlight.Root>
 */
export const Highlight = Object.assign(HighlightComponent, {
  Root: HighlightRoot,
  Match: HighlightMatch,
})

export type HighlightStyleMap = Record<string, Partial<CSSStyleDeclaration>>

const DEFAULT_SEARCH_STYLES: HighlightStyleMap = {
  search: { backgroundColor: 'rgb(253 224 71)', color: 'rgb(113 63 18)' },
  'search-current': { backgroundColor: 'rgb(249 115 22)', color: 'white' },
}

export interface HighlightStylesProps {
  /** `::highlight()` rules by name (default: `search` / `search-current`). */
  styles?: HighlightStyleMap
}

/**
 * Inline `<style>` with `::highlight()` rules. Defaults match the names used by
 * {@link useHighlightSearch}.
 */
export function HighlightStyles({
  styles = DEFAULT_SEARCH_STYLES,
}: HighlightStylesProps): ReactNode {
  return <style>{generateHighlightCSS(styles)}</style>
}

export { highlights } from './core'
