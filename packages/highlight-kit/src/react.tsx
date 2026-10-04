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
import { tokenizeValue, type OverlapStrategy, type TokenRule } from './tokenize'
import {
  createValueHighlighter,
  createValueRangeRegistry,
  createValueRanges,
  disconnectValueRanges,
  scrollValueRangeIntoView,
  type ValueHighlighter,
  type ValueRangeElement,
  type ValueRangeRegistry,
} from './value-range'

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

/** Props for {@link HighlightProvider}. */
export interface HighlightProviderProps {
  /** Omit to create an isolated controller once for this provider. */
  controller?: HighlightController
  /** Subtree whose hooks use this controller. */
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

/** Match options for {@link useTextMatches}, plus DOM change tracking. */
export interface TextMatchOptions extends MatchOptions {
  /**
   * Recompute when the container's DOM changes (MutationObserver).
   * @default true
   */
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

/** Options for {@link useHighlight}. */
export interface UseHighlightOptions extends MatchOptions {
  /** The text/regex to highlight. Falsy clears this source. */
  query: string | RegExp
  /** CSS ::highlight() name. Defaults to a unique per-instance name. */
  name?: string
  /**
   * Stacking order against other highlight names.
   * @default 0
   */
  priority?: number
  /**
   * Recompute when the container's DOM changes (MutationObserver).
   * @default false
   */
  observe?: boolean
}

/**
 * Return value of {@link useHighlight}: the container ref, the resolved name,
 * and that name's current snapshot.
 *
 * @template T - Element type the `ref` is attached to
 */
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
 *
 * @template T - Element type the `ref` is attached to
 *
 * @example
 * ```tsx
 * import { useHighlight } from '@cbcruk/highlight-kit/react'
 *
 * function SearchableText({ query }: { query: string }) {
 *   const { ref, count } = useHighlight<HTMLDivElement>({ query, name: 'search' })
 *   return (
 *     <>
 *       <span>{count} matches</span>
 *       <div ref={ref}>...</div>
 *     </>
 *   )
 * }
 * ```
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

/** Options for {@link useHighlightSearch}. */
export interface UseHighlightSearchOptions extends TextMatchOptions {
  /**
   * Base highlight name. The active match is registered under
   * `${name}-current` with a higher priority.
   * @default 'search'
   */
  name?: string
}

/** Return value of {@link useHighlightSearch}. */
export interface UseHighlightSearchResult {
  /** Number of ranges registered under the base name. */
  count: number
  /** Index of the active match, or -1 when there are no matches. */
  active: number
  /** Move to the next match, wrapping to the first after the last. */
  next(): void
  /** Move to the previous match, wrapping to the last before the first. */
  prev(): void
}

/**
 * Search with next/prev navigation. All matches go to `name`, the active one to
 * `${name}-current`, and the active match is scrolled into view.
 *
 * When the matches change, the active index is clamped to the new match count.
 *
 * @example
 * ```tsx
 * import { useRef, useState } from 'react'
 * import { HighlightStyles, useHighlightSearch } from '@cbcruk/highlight-kit/react'
 *
 * function Search() {
 *   const ref = useRef<HTMLDivElement>(null)
 *   const [query, setQuery] = useState('wisdom')
 *   const { count, active, next, prev } = useHighlightSearch(ref, query)
 *   return (
 *     <>
 *       <HighlightStyles />
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *       <span>{count === 0 ? '0/0' : `${active + 1}/${count}`}</span>
 *       <button onClick={prev}>Prev</button>
 *       <button onClick={next}>Next</button>
 *       <div ref={ref}>...</div>
 *     </>
 *   )
 * }
 * ```
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

/** Props for the declarative {@link Highlight} component. */
export interface HighlightProps extends MatchOptions {
  /** The text/regex to highlight. Falsy clears this source. */
  query: string | RegExp
  /** CSS ::highlight() name. Defaults to a unique per-instance name. */
  name?: string
  /**
   * Stacking order against other highlight names.
   * @default 0
   */
  priority?: number
  /**
   * Recompute when the container's DOM changes (MutationObserver).
   * @default false
   */
  observe?: boolean
  /**
   * Element to render as the scan container.
   * @default 'div'
   */
  as?: ElementType
  /** Content rendered inside the container and scanned for matches. */
  children?: ReactNode
  /** Class name for the container element. */
  className?: string
  /** Inline style for the container element. Tip: pass `{ display: 'contents' }` for zero layout impact. */
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

/** Props for {@link HighlightRoot}; other `div` props go to the rendered element. */
export interface HighlightRootProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  /** Default highlight name for nested <Highlight.Match> without `name`. */
  name: string
  /**
   * Element to render as the scan container.
   * @default 'div'
   */
  as?: ElementType
  /** Content rendered inside the container, including `<Highlight.Match>` elements. */
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

/** Props for {@link HighlightMatch}. */
export interface HighlightMatchProps extends TextMatchOptions {
  /** The text/regex to find in the enclosing Root's container. */
  pattern: string | RegExp
  /** Falls back to the enclosing Root's `name`. */
  name?: string
  /**
   * Stacking order against other highlight names.
   * @default 0
   */
  priority?: number
}

/**
 * Effect-only: renders nothing, scans the enclosing Root's container and
 * registers the matches. Tracks DOM changes by default (`observe`).
 *
 * @throws When rendered outside `<Highlight.Root>`.
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
 * Renders a single wrapper element and highlights matches of `query` within it.
 *
 * Multiple <Highlight> sharing the same `name` are unioned by the core, so one
 * ::highlight(name) CSS rule styles them all.
 *
 * For several patterns over one container use the compound form:
 * `Highlight.Root` with nested `Highlight.Match` elements.
 *
 * @example Single pattern
 * ```tsx
 * import { Highlight } from '@cbcruk/highlight-kit/react'
 *
 * function Article({ keyword }: { keyword: string }) {
 *   return (
 *     <Highlight query={keyword} name="search" style={{ display: 'contents' }}>
 *       <article>...</article>
 *     </Highlight>
 *   )
 * }
 * ```
 *
 * @example Several patterns over one container
 * ```tsx
 * import { Highlight } from '@cbcruk/highlight-kit/react'
 *
 * function Logs({ logs }: { logs: string }) {
 *   return (
 *     <Highlight.Root name="log-info" as="pre">
 *       {logs}
 *       <Highlight.Match name="log-error" pattern={/ERROR:[^\n]+/} />
 *       <Highlight.Match pattern={/INFO:[^\n]+/} />
 *     </Highlight.Root>
 *   )
 * }
 * ```
 */
export const Highlight = Object.assign(HighlightComponent, {
  Root: HighlightRoot,
  Match: HighlightMatch,
})

/** `::highlight()` style declarations keyed by highlight name. */
export type HighlightStyleMap = Record<string, Partial<CSSStyleDeclaration>>

const DEFAULT_SEARCH_STYLES: HighlightStyleMap = {
  search: { backgroundColor: 'rgb(253 224 71)', color: 'rgb(113 63 18)' },
  'search-current': { backgroundColor: 'rgb(249 115 22)', color: 'white' },
}

/** Props for {@link HighlightStyles}. */
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

/**
 * Stable identity for a rule list.
 *
 * Rule arrays are almost always written inline, so a new reference arrives on
 * every render. Keying effects on the rules' *content* instead keeps a fresh
 * array from tearing down and rebuilding the highlighter each render, which
 * would discard and recreate every live range.
 */
function useRulesKey(rules: readonly TokenRule[]): string {
  return useMemo(
    () =>
      JSON.stringify(
        rules.map((rule) => [
          rule.name,
          String(rule.pattern),
          rule.caseSensitive ?? false,
          rule.wholeWord ?? false,
          rule.priority ?? 0,
        ]),
      ),
    [rules],
  )
}

/** Options shared by the form-control hooks. */
export interface ValueHighlightOptions {
  /**
   * The control's current value, for a controlled component.
   *
   * Assigning `value` collapses every live range and fires no `input` event, so
   * without this the highlight would go stale on a programmatic change (a reset
   * button, loading a template). Omit it for an uncontrolled control: typing is
   * tracked through `input` either way.
   */
  value?: string
  /**
   * Re-tokenize on the control's `input` events.
   * @default true
   */
  observe?: boolean
}

/** Options for {@link useValueTokens}. */
export interface UseValueTokensOptions extends ValueHighlightOptions {
  /**
   * How matches covering the same characters resolve.
   * @default 'first'
   */
  overlap?: OverlapStrategy
}

/**
 * Return value of {@link useValueTokens}.
 *
 * @template T - The form control element type
 */
export interface UseValueTokensResult<T extends ValueRangeElement> {
  /** Attach to the `<input>` or `<textarea>` to tokenize. */
  ref: RefObject<T | null>
  /** Whether this browser and this element support value ranges. */
  supported: boolean
  /** Match count per highlight name, with an entry for every rule name. */
  counts: Readonly<Record<string, number>>
}

/**
 * Tokenize a form control's value and highlight each rule's matches.
 *
 * The control's text is re-tokenized on every `input` event, with one highlight
 * name per rule name, and the previous generation of live ranges is released.
 * Rules are compared by content, so an inline rule array is fine.
 *
 * Needs `OpaqueRange` (Chromium 152+). Everywhere else `supported` is false and
 * the hook does nothing, leaving the control to render normally.
 *
 * @template T - The form control element type
 * @param rules - Ordered rules; earlier ones win, see {@link TokenRule}
 * @returns The control ref, support flag, and per-name match counts
 *
 * @example A textarea highlighted like a code editor
 * ```tsx
 * import { HighlightStyles, useValueTokens } from '@cbcruk/highlight-kit/react'
 *
 * const RULES = [
 *   { name: 'comment', pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
 *   { name: 'string', pattern: /'[^']*'|"[^"]*"/ },
 *   { name: 'keyword', pattern: /\b(?:const|function|return)\b/ },
 * ]
 *
 * function CodeArea() {
 *   const { ref, supported, counts } = useValueTokens<HTMLTextAreaElement>(RULES)
 *   return (
 *     <>
 *       <HighlightStyles
 *         styles={{
 *           comment: { color: '#6b7280' },
 *           string: { color: '#16a34a' },
 *           keyword: { color: '#7c3aed' },
 *         }}
 *       />
 *       <textarea ref={ref} defaultValue="const x = 1 // note" />
 *       {!supported && <p>This browser cannot highlight inside a textarea.</p>}
 *       <small>{counts.keyword ?? 0} keywords</small>
 *     </>
 *   )
 * }
 * ```
 */
export function useValueTokens<T extends ValueRangeElement = HTMLTextAreaElement>(
  rules: readonly TokenRule[],
  options: UseValueTokensOptions = {},
): UseValueTokensResult<T> {
  const { overlap, value, observe = true } = options
  const controller = useHighlightController()
  const sourceId = useId()
  const ref = useRef<T>(null)
  const rulesKey = useRulesKey(rules)
  const rulesRef = useRef(rules)
  rulesRef.current = rules
  const highlighterRef = useRef<ValueHighlighter | null>(null)
  const [supported, setSupported] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const highlighter = createValueHighlighter({
      element,
      rules: rulesRef.current,
      overlap,
      controller,
      sourceId,
      observe,
    })
    highlighterRef.current = highlighter
    setSupported(highlighter.supported)

    return () => {
      highlighterRef.current = null
      highlighter.dispose()
    }
  }, [controller, sourceId, rulesKey, overlap, observe])

  // The highlighter already tokenized the value it was built with, so only
  // later changes need a refresh.
  const seenFirstValue = useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (!seenFirstValue.current) {
      seenFirstValue.current = true
      return
    }
    highlighterRef.current?.refresh()
  }, [value])

  const snapshots = useHighlightSnapshots()
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const rule of rulesRef.current) {
      result[rule.name] = snapshots[rule.name]?.count ?? 0
    }
    return result
    // rulesKey stands in for rulesRef.current's content.
  }, [snapshots, rulesKey])

  return { ref, supported, counts }
}

/** Options for {@link useValueHighlight}. */
export interface UseValueHighlightOptions
  extends MatchOptions,
    ValueHighlightOptions {
  /** Text or expression to highlight. Falsy clears this source. */
  query: string | RegExp
  /** CSS `::highlight()` name. Defaults to a unique per-instance name. */
  name?: string
  /**
   * Stacking order against other highlight names.
   * @default 0
   */
  priority?: number
}

/**
 * Return value of {@link useValueHighlight}.
 *
 * @template T - The form control element type
 */
export interface UseValueHighlightResult<T extends ValueRangeElement>
  extends HighlightSnapshot {
  /** Attach to the `<input>` or `<textarea>` to scan. */
  ref: RefObject<T | null>
  /** The resolved highlight name (auto-generated if not provided). */
  name: string
  /** Whether this browser and this element support value ranges. */
  supported: boolean
}

/**
 * Highlight one pattern inside an `<input>` or `<textarea>`.
 *
 * The single-pattern form of {@link useValueTokens} — the counterpart to
 * {@link useHighlight}, which cannot reach into a form control's value.
 *
 * @template T - The form control element type
 *
 * @example Flagging a word as it is typed
 * ```tsx
 * import { useValueHighlight } from '@cbcruk/highlight-kit/react'
 *
 * function Composer() {
 *   const { ref, count, supported } = useValueHighlight<HTMLTextAreaElement>({
 *     query: /\bexample\b/gi,
 *     name: 'flagged',
 *   })
 *   return (
 *     <>
 *       <style>{'::highlight(flagged) { background: #fde68a }'}</style>
 *       <textarea ref={ref} />
 *       {supported && <small>{count} occurrences</small>}
 *     </>
 *   )
 * }
 * ```
 */
export function useValueHighlight<
  T extends ValueRangeElement = HTMLInputElement,
>(options: UseValueHighlightOptions): UseValueHighlightResult<T> {
  const {
    query,
    priority = 0,
    caseSensitive,
    wholeWord,
    value,
    observe,
  } = options
  const autoId = useId()
  const name = options.name ?? `hk-value-${autoId}`

  const rules = useMemo<TokenRule[]>(
    () =>
      query ? [{ name, pattern: query, caseSensitive, wholeWord, priority }] : [],
    [name, query, caseSensitive, wholeWord, priority],
  )

  const { ref, supported, counts } = useValueTokens<T>(rules, {
    value,
    observe,
  })
  const count = counts[name] ?? 0

  return { ref, name, supported, count, active: count > 0 }
}

/** Options for {@link useValueHighlightSearch}. */
export interface UseValueHighlightSearchOptions
  extends MatchOptions,
    ValueHighlightOptions {
  /**
   * Base highlight name. The active match is registered under
   * `${name}-current` with a higher priority.
   * @default 'search'
   */
  name?: string
}

/**
 * Return value of {@link useValueHighlightSearch}.
 *
 * @template T - The form control element type
 */
export interface UseValueHighlightSearchResult<T extends ValueRangeElement> {
  /** Attach to the `<input>` or `<textarea>` to search. */
  ref: RefObject<T | null>
  /** Number of matches in the control's value. */
  count: number
  /** Index of the active match, or -1 when there are no matches. */
  active: number
  /** Move to the next match, wrapping to the first after the last. */
  next(): void
  /** Move to the previous match, wrapping to the last before the first. */
  prev(): void
  /** Whether this browser and this element support value ranges. */
  supported: boolean
}

/**
 * Search inside an `<input>` or `<textarea>` with next/prev navigation.
 *
 * All matches go to `name`, the active one to `${name}-current` at a higher
 * priority, and the control is scrolled just far enough to reveal the active
 * match. Scrolling adjusts the control's own `scrollTop`/`scrollLeft` rather
 * than calling `setSelectionRange()`, so the caret and the user's selection are
 * left untouched.
 *
 * @template T - The form control element type
 * @param query - Text or expression to find. Falsy clears the highlight
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import {
 *   HighlightStyles,
 *   useValueHighlightSearch,
 * } from '@cbcruk/highlight-kit/react'
 *
 * function NoteSearch() {
 *   const [query, setQuery] = useState('')
 *   const { ref, count, active, next, prev } =
 *     useValueHighlightSearch<HTMLTextAreaElement>(query)
 *
 *   return (
 *     <>
 *       <HighlightStyles />
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *       <span>{count === 0 ? '0/0' : `${active + 1}/${count}`}</span>
 *       <button onClick={prev}>Prev</button>
 *       <button onClick={next}>Next</button>
 *       <textarea ref={ref} rows={10} />
 *     </>
 *   )
 * }
 * ```
 */
export function useValueHighlightSearch<
  T extends ValueRangeElement = HTMLTextAreaElement,
>(
  query: string | RegExp,
  options: UseValueHighlightSearchOptions = {},
): UseValueHighlightSearchResult<T> {
  const {
    name = 'search',
    caseSensitive,
    wholeWord,
    value,
    observe = true,
  } = options
  const controller = useHighlightController()
  const sourceId = useId()
  const ref = useRef<T>(null)
  const registryRef = useRef<ValueRangeRegistry | null>(null)
  const [spans, setSpans] = useState<Array<{ start: number; end: number }>>([])
  const [active, setActive] = useState(0)
  const [supported, setSupported] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const registry = createValueRangeRegistry({ element, controller, sourceId })
    registryRef.current = registry
    setSupported(registry.supported)

    return () => {
      registryRef.current = null
      registry.dispose()
    }
  }, [controller, sourceId])

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const recompute = (): void => {
      const next = query
        ? tokenizeValue(element.value, [
            { name, pattern: query, caseSensitive, wholeWord },
          ]).map(({ start, end }) => ({ start, end }))
        : []
      // Keep the previous array when nothing moved, so typing between matches
      // does not re-register ranges or re-render.
      setSpans((previous) =>
        previous.length === next.length &&
        previous.every(
          (span, i) => span.start === next[i].start && span.end === next[i].end,
        )
          ? previous
          : next,
      )
    }

    recompute()
    if (!observe) return
    element.addEventListener('input', recompute)
    return () => element.removeEventListener('input', recompute)
  }, [name, query, caseSensitive, wholeWord, value, observe])

  useIsomorphicLayoutEffect(() => {
    setActive((a) => (spans.length === 0 ? 0 : Math.min(a, spans.length - 1)))
  }, [spans])

  useIsomorphicLayoutEffect(() => {
    const registry = registryRef.current
    if (!registry) return

    const current = spans[active]
    registry.commit([
      { name, priority: 0, spans },
      ...(current
        ? [{ name: `${name}-current`, priority: 1, spans: [current] }]
        : []),
    ])
  }, [name, spans, active])

  useEffect(() => {
    const element = ref.current
    const current = spans[active]
    if (!element || !current) return

    // A throwaway range purely for geometry: a value range has no node to call
    // scrollIntoView() on. Released immediately so the control stops tracking it.
    const ranges = createValueRanges(element, [current])
    if (ranges[0]) scrollValueRangeIntoView(element, ranges[0])
    disconnectValueRanges(ranges)
  }, [spans, active])

  const next = useCallback(
    () => setActive((a) => (spans.length ? (a + 1) % spans.length : 0)),
    [spans.length],
  )
  const prev = useCallback(
    () =>
      setActive((a) =>
        spans.length ? (a - 1 + spans.length) % spans.length : 0,
      ),
    [spans.length],
  )

  return {
    ref,
    count: spans.length,
    active: spans.length ? active : -1,
    next,
    prev,
    supported,
  }
}
