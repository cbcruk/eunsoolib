/*
 * @highlight-kit/core
 *
 * Framework-agnostic singleton controller for the CSS Custom Highlight API.
 *
 * Why a singleton?
 *   `CSS.highlights` is itself a document-global registry (HighlightRegistry).
 *   Highlight *names* live in one global namespace, so a single source of truth
 *   is the only correct model — anything else races on the same keys.
 *
 * The controller also exposes a `useSyncExternalStore`-compatible surface
 * (`subscribe` + `getSnapshot`) so framework adapters can stay thin.
 */

/** Options controlling how a string pattern is matched against text. */
export interface MatchOptions {
  /**
   * Case sensitive match. Ignored for `RegExp` patterns, which keep their own flags.
   * @default false
   */
  caseSensitive?: boolean
  /**
   * Match whole words only (wraps the pattern in `\b`). Ignored for `RegExp` patterns.
   * @default false
   */
  wholeWord?: boolean
}

/** Reactive state of one highlight name, as exposed to subscribers. */
export interface HighlightSnapshot {
  /** Whether this name currently has any registered ranges */
  readonly active: boolean
  /** Number of ranges registered under this name */
  readonly count: number
}

/** Stable empty snapshot — referentially constant for useSyncExternalStore */
const EMPTY_SNAPSHOT: HighlightSnapshot = Object.freeze({
  active: false,
  count: 0,
})

/** A source contributing ranges, keyed by a unique id (e.g. React's useId) */
export type SourceId = string | symbol

/**
 * Where reconciled ranges are written. The controller's bookkeeping always
 * runs; only this side effect is swappable (CSS registry, no-op for tests/SSR).
 */
export interface HighlightSink {
  /** Replace the registered highlight for `name` with `ranges`. */
  commit(name: string, ranges: Range[], priority: number): void
  /** Drop the registered highlight for `name`. */
  remove(name: string): void
  /**
   * When this returns false the controller skips bookkeeping entirely, so
   * snapshots stay empty. Omit it to always track ranges.
   */
  isSupported?(): boolean
}

/** Options for {@link createHighlightController}. */
export interface HighlightControllerOptions {
  /** Where reconciled ranges are written. Defaults to {@link createCssHighlightSink}. */
  sink?: HighlightSink
}

// ---------------------------------------------------------------------------
// Pure utilities (no global state)
// ---------------------------------------------------------------------------

/** Whether the CSS Custom Highlight API (`CSS.highlights` and `Highlight`) is available. */
export function isHighlightSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  )
}

/** Collect all non-empty text nodes under an element. */
export function getTextNodes(root: Node): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim()) {
      nodes.push(node as Text)
    }
  }
  return nodes
}

function toRegExp(pattern: string | RegExp, options: MatchOptions): RegExp {
  if (pattern instanceof RegExp) {
    // Ensure the global flag so exec() iterates all matches.
    return pattern.flags.includes('g')
      ? pattern
      : new RegExp(pattern.source, pattern.flags + 'g')
  }
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const body = options.wholeWord ? `\\b${escaped}\\b` : escaped
  return new RegExp(body, options.caseSensitive ? 'g' : 'gi')
}

/**
 * Compute Range objects for every match of `pattern` within `root`.
 * Pure: returns ranges, does not touch the registry.
 */
export function computeRanges(
  root: Element,
  pattern: string | RegExp,
  options: MatchOptions = {},
): Range[] {
  if (!pattern) return []
  const regex = toRegExp(pattern, options)
  const ranges: Range[] = []

  for (const textNode of getTextNodes(root)) {
    const text = textNode.textContent ?? ''
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      // Guard against zero-width matches causing an infinite loop.
      if (m[0].length === 0) {
        regex.lastIndex++
        continue
      }
      try {
        const range = new Range()
        range.setStart(textNode, m.index)
        range.setEnd(textNode, m.index + m[0].length)
        ranges.push(range)
      } catch {
        /* out-of-bounds — skip */
      }
    }
  }
  return ranges
}

/**
 * Map flat character offsets onto Range objects. Useful when you already know positions.
 *
 * Offsets count over the concatenated text of {@link getTextNodes}, which skips
 * whitespace-only text nodes. When `root` contains such nodes, offsets differ
 * from `root.textContent`.
 */
export function rangesFromOffsets(
  root: Element,
  spans: ReadonlyArray<{ start: number; end: number }>,
): Range[] {
  const nodes = getTextNodes(root)
  const layout: Array<{ node: Text; start: number; end: number }> = []
  let offset = 0
  for (const node of nodes) {
    const len = node.textContent?.length ?? 0
    layout.push({ node, start: offset, end: offset + len })
    offset += len
  }

  const ranges: Range[] = []
  for (const { start, end } of spans) {
    for (const { node, start: ns, end: ne } of layout) {
      if (ns < end && ne > start) {
        try {
          const range = new Range()
          range.setStart(node, Math.max(0, start - ns))
          range.setEnd(node, Math.min(node.textContent?.length ?? 0, end - ns))
          ranges.push(range)
        } catch {
          /* skip */
        }
      }
    }
  }
  return ranges
}

// ---------------------------------------------------------------------------
// Sinks
// ---------------------------------------------------------------------------

/** Sink that writes to the document-global `CSS.highlights` registry. */
export function createCssHighlightSink(): HighlightSink {
  return {
    commit(name, ranges, priority): void {
      if (!isHighlightSupported()) return
      const highlight = new Highlight(...ranges)
      highlight.priority = priority
      CSS.highlights.set(name, highlight)
    },
    remove(name): void {
      if (!isHighlightSupported()) return
      CSS.highlights.delete(name)
    },
    isSupported: isHighlightSupported,
  }
}

/** Side-effect-free sink: bookkeeping still runs, nothing is painted. */
export function createNoopSink(): HighlightSink {
  return { commit(): void {}, remove(): void {} }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

interface HighlightEntry {
  priority: number
  sources: Map<SourceId, Range[]>
}

const EMPTY_SNAPSHOTS: Readonly<Record<string, HighlightSnapshot>> =
  Object.freeze({})

/**
 * Tracks ranges per highlight name and source, and writes their union to a sink.
 *
 * Multiple sources may contribute to one name; each change reconciles the name
 * into a single highlight and notifies `subscribe` listeners. Create instances
 * with {@link createHighlightController} or use the shared {@link highlights}.
 *
 * @example
 * ```ts
 * import { computeRanges, highlights } from '@cbcruk/highlight-kit'
 *
 * const el = document.querySelector('#article')!
 * highlights.set('search', 'my-source', computeRanges(el, 'wisdom'))
 * highlights.getSnapshot('search') // { active: true, count: ... }
 * highlights.remove('search', 'my-source')
 * ```
 */
class HighlightController {
  #sink: HighlightSink
  /** name -> (sourceId -> ranges). Multiple sources may share a name. */
  #entries = new Map<string, HighlightEntry>()
  /** Cached per-name snapshots; refs are stable until that name changes. */
  #snapshots = new Map<string, HighlightSnapshot>()
  /** Cached name -> snapshot record; rebuilt on every emit. */
  #allSnapshots: Readonly<Record<string, HighlightSnapshot>> = EMPTY_SNAPSHOTS
  /** External-store listeners. */
  #listeners = new Set<() => void>()

  /** Create a controller that writes to `sink` (the CSS registry sink by default). */
  constructor({
    sink = createCssHighlightSink(),
  }: HighlightControllerOptions = {}) {
    this.#sink = sink
  }

  /**
   * Whether the sink reports support. `true` when the sink has no `isSupported`.
   * When `false`, {@link HighlightController.set} is a no-op.
   */
  get supported(): boolean {
    return this.#sink.isSupported?.() ?? true
  }

  /** useSyncExternalStore: stable identity (arrow field on the instance). */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /** Snapshot for a given highlight name (referentially stable). */
  getSnapshot = (name: string): HighlightSnapshot => {
    return this.#snapshots.get(name) ?? EMPTY_SNAPSHOT
  }

  /** Snapshots of every active name (referentially stable between changes). */
  getSnapshots = (): Readonly<Record<string, HighlightSnapshot>> => {
    return this.#allSnapshots
  }

  /** SSR / unsupported: constant empty snapshot. */
  getServerSnapshot = (): HighlightSnapshot => EMPTY_SNAPSHOT

  /** SSR / unsupported: constant empty record. */
  getServerSnapshots = (): Readonly<Record<string, HighlightSnapshot>> =>
    EMPTY_SNAPSHOTS

  /** Union of every source's ranges currently registered under `name`. */
  getRanges(name: string): Range[] {
    const entry = this.#entries.get(name)
    return entry ? this.#merge(entry) : []
  }

  /**
   * Register/replace a source's ranges under a name, then reconcile.
   * `priority` applies to the whole name; the most recent call wins.
   */
  set(name: string, sourceId: SourceId, ranges: Range[], priority = 0): void {
    if (!this.supported) return
    let entry = this.#entries.get(name)
    if (!entry) {
      entry = { priority, sources: new Map() }
      this.#entries.set(name, entry)
    } else {
      entry.priority = priority
    }
    entry.sources.set(sourceId, ranges)
    this.#reconcile(name)
    this.#emit()
  }

  /** Remove a single source's contribution to a name. */
  remove(name: string, sourceId: SourceId): void {
    const entry = this.#entries.get(name)
    if (!entry || !entry.sources.delete(sourceId)) return
    if (entry.sources.size === 0) this.#entries.delete(name)
    this.#reconcile(name)
    this.#emit()
  }

  /** Drop a name entirely, regardless of sources. */
  clear(name: string): void {
    if (!this.#entries.delete(name)) return
    this.#reconcile(name)
    this.#emit()
  }

  /** Drop everything this controller manages. */
  clearAll(): void {
    const names = [...this.#entries.keys()]
    this.#entries.clear()
    for (const name of names) this.#sink.remove(name)
    this.#snapshots.clear()
    this.#emit()
  }

  #merge(entry: HighlightEntry): Range[] {
    const all: Range[] = []
    for (const ranges of entry.sources.values()) all.push(...ranges)
    return all
  }

  /** Union all sources for `name` into one highlight and update the snapshot. */
  #reconcile(name: string): void {
    const entry = this.#entries.get(name)
    const all = entry ? this.#merge(entry) : []

    if (!entry || all.length === 0) {
      this.#sink.remove(name)
      this.#snapshots.set(name, EMPTY_SNAPSHOT)
      return
    }

    this.#sink.commit(name, all, entry.priority)
    // New object => new reference => subscribers of this name re-render.
    this.#snapshots.set(name, { active: true, count: all.length })
  }

  #emit(): void {
    const next: Record<string, HighlightSnapshot> = {}
    for (const [name, snapshot] of this.#snapshots) {
      if (snapshot.active) next[name] = snapshot
    }
    this.#allSnapshots = next
    for (const listener of this.#listeners) listener()
  }
}

/**
 * Create an isolated controller. Useful for tests (with {@link createNoopSink})
 * or for scoping subscriptions via the React `HighlightProvider`. Highlight
 * *names* are still document-global once painted by a CSS sink.
 */
export function createHighlightController(
  options?: HighlightControllerOptions,
): HighlightController {
  return new HighlightController(options)
}

/** The shared singleton. */
export const highlights = createHighlightController()
export type { HighlightController }

// ---------------------------------------------------------------------------
// Optional CSS helpers
// ---------------------------------------------------------------------------

/**
 * Build `::highlight(name)` CSS rules from a style map without injecting them.
 *
 * camelCase property names are converted to kebab-case; values are written as is.
 *
 * @example
 * ```ts
 * import { generateHighlightCSS } from '@cbcruk/highlight-kit'
 *
 * generateHighlightCSS({ search: { backgroundColor: 'yellow' } })
 * // '::highlight(search) {\n  background-color: yellow;\n}'
 * ```
 */
export function generateHighlightCSS(
  styles: Record<string, Partial<CSSStyleDeclaration>>,
): string {
  return Object.entries(styles)
    .map(([name, style]) => {
      const body = Object.entries(style)
        .map(([prop, value]) => {
          const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
          return `  ${kebab}: ${value as string};`
        })
        .join('\n')
      return `::highlight(${name}) {\n${body}\n}`
    })
    .join('\n\n')
}

/**
 * Append a `<style>` element with `::highlight()` rules to `document.head`.
 *
 * An existing element with the same `id` is removed first, so calling it again
 * replaces the previous rules.
 *
 * @param styles - Style declarations keyed by highlight name
 * @param id - `id` of the `<style>` element
 * @returns The inserted `<style>` element
 */
export function injectHighlightStyles(
  styles: Record<string, Partial<CSSStyleDeclaration>>,
  id = 'highlight-kit-styles',
): HTMLStyleElement {
  document.getElementById(id)?.remove()
  const el = document.createElement('style')
  el.id = id
  el.textContent = generateHighlightCSS(styles)
  document.head.appendChild(el)
  return el
}
