/**
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

export interface MatchOptions {
  /** Case sensitive match (default: false) */
  caseSensitive?: boolean
  /** Match whole words only (default: false) */
  wholeWord?: boolean
}

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
type SourceId = string

// ---------------------------------------------------------------------------
// Pure utilities (no global state)
// ---------------------------------------------------------------------------

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
 * Map flat character offsets (over the concatenated text content of `root`)
 * onto Range objects. Useful when you already know positions.
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
// Singleton controller
// ---------------------------------------------------------------------------

class HighlightController {
  /** name -> (sourceId -> ranges). Multiple sources may share a name. */
  #contributions = new Map<string, Map<SourceId, Range[]>>()
  /** Cached per-name snapshots; refs are stable until that name changes. */
  #snapshots = new Map<string, HighlightSnapshot>()
  /** External-store listeners. */
  #listeners = new Set<() => void>()

  get supported(): boolean {
    return isHighlightSupported()
  }

  /** useSyncExternalStore: stable identity (arrow field on the singleton). */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /** Snapshot for a given highlight name (referentially stable). */
  getSnapshot = (name: string): HighlightSnapshot => {
    return this.#snapshots.get(name) ?? EMPTY_SNAPSHOT
  }

  /** SSR / unsupported: constant empty snapshot. */
  getServerSnapshot = (): HighlightSnapshot => EMPTY_SNAPSHOT

  /** Register/replace a source's ranges under a name, then reconcile. */
  set(name: string, sourceId: SourceId, ranges: Range[]): void {
    if (!this.supported) return
    let bySource = this.#contributions.get(name)
    if (!bySource) {
      bySource = new Map()
      this.#contributions.set(name, bySource)
    }
    bySource.set(sourceId, ranges)
    this.#reconcile(name)
    this.#emit()
  }

  /** Remove a single source's contribution to a name. */
  remove(name: string, sourceId: SourceId): void {
    const bySource = this.#contributions.get(name)
    if (!bySource || !bySource.delete(sourceId)) return
    if (bySource.size === 0) this.#contributions.delete(name)
    this.#reconcile(name)
    this.#emit()
  }

  /** Drop a name entirely, regardless of sources. */
  clear(name: string): void {
    if (!this.#contributions.delete(name)) return
    this.#reconcile(name)
    this.#emit()
  }

  /** Drop everything this controller manages. */
  clearAll(): void {
    const names = [...this.#contributions.keys()]
    this.#contributions.clear()
    if (this.supported) {
      for (const name of names) CSS.highlights.delete(name)
    }
    this.#snapshots.clear()
    this.#emit()
  }

  /** Union all sources for `name` into one Highlight and update the snapshot. */
  #reconcile(name: string): void {
    if (!this.supported) return
    const bySource = this.#contributions.get(name)

    if (!bySource || bySource.size === 0) {
      CSS.highlights.delete(name)
      this.#snapshots.set(name, EMPTY_SNAPSHOT)
      return
    }

    const all: Range[] = []
    for (const ranges of bySource.values()) all.push(...ranges)

    if (all.length === 0) {
      CSS.highlights.delete(name)
      this.#snapshots.set(name, EMPTY_SNAPSHOT)
      return
    }

    CSS.highlights.set(name, new Highlight(...all))
    // New object => new reference => subscribers of this name re-render.
    this.#snapshots.set(name, { active: true, count: all.length })
  }

  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
}

/** The shared singleton. */
export const highlights = new HighlightController()
export type { HighlightController }

// ---------------------------------------------------------------------------
// Optional CSS helpers
// ---------------------------------------------------------------------------

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
