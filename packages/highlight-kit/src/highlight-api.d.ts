/**
 * Build-only augmentation for the CSS Custom Highlight API.
 *
 * Modern `lib.dom.d.ts` already ships `Highlight`, `HighlightRegistry`, and
 * `CSS.highlights`, but it currently types `HighlightRegistry` with only
 * `forEach` — the maplike `set`/`get`/`has`/`delete`/`clear`/`size` members are
 * missing. The core writes to the registry directly, so we merge them back in.
 *
 * This file is never published; it only types this package's own source.
 */

interface HighlightRegistry {
  set(name: string, highlight: Highlight): this
  get(name: string): Highlight | undefined
  has(name: string): boolean
  delete(name: string): boolean
  clear(): void
  readonly size: number
}
