/**
 * `OpaqueRange` adapter — highlighting text *inside* `<input>` and `<textarea>`.
 *
 * A DOM `Range` cannot point into a form control's value, so the rest of this
 * package (`computeRanges`, `getTextNodes`) does nothing for one. Chromium 152
 * added `element.createValueRange(start, end)`, which returns an `OpaqueRange`
 * over the control's value. `Highlight` is setlike over `AbstractRange`, so
 * those ranges can go into the same highlight as ordinary DOM ranges.
 *
 * The lifecycle is the part worth wrapping. Value ranges are *live*: the control
 * keeps every range `createValueRange()` ever handed out and shifts all of their
 * offsets on every edit. Re-matching a pattern after each keystroke therefore
 * leaks a fresh generation of live ranges per keystroke unless the previous
 * generation is explicitly released, which is what {@link ValueHighlighter}
 * does and what hand-rolled `highlight.clear()` loops usually miss.
 */

import {
  highlights,
  type HighlightController,
  type HighlightRange,
  type SourceId,
} from './core'
import {
  groupTokens,
  tokenizeValue,
  type NamedSpans,
  type OverlapStrategy,
  type TokenRule,
} from './tokenize'

/** Form controls that can expose ranges over their value. */
export type ValueRangeElement = HTMLInputElement | HTMLTextAreaElement

/**
 * `input` types for which `createValueRange()` applies. Every other type throws
 * `NotSupportedError`. Matches the types the Selection API applies to.
 */
const SUPPORTED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'tel',
  'url',
  'password',
])

/** The subset of `createValueRange()`'s host interface this module calls. */
interface ValueRangeCreation {
  createValueRange(start: number, end: number): ValueRange
}

/**
 * A live range over a form control's value — the `OpaqueRange` returned by
 * `createValueRange()`.
 *
 * Offsets are UTF-16 code unit indices into `element.value`, the same units as
 * `selectionStart`/`selectionEnd`, and they shift as the value is edited.
 *
 * This is deliberately *not* typed as an `AbstractRange`. Shipping this API
 * moved `startContainer`/`endContainer` off `AbstractRange` onto a new
 * `NodeRange` interface, and on a value range both read `undefined`. Declaring
 * them as `Node` would be a lie, so they are absent here: use
 * {@link ValueRange.getBoundingClientRect} for geometry and `element.value` for
 * text. There is also no `toString()` and no constructor.
 */
export interface ValueRange {
  /** Whether the range is empty. A collapsed range is never painted. */
  readonly collapsed: boolean
  /** Start offset into the control's value, in UTF-16 code units. */
  readonly startOffset: number
  /** End offset into the control's value, exclusive. */
  readonly endOffset: number
  /** Client rects of the range, one per line box it covers. */
  getClientRects(): DOMRectList
  /** Bounding box of the range. Empty once the range is disconnected. */
  getBoundingClientRect(): DOMRect
  /**
   * Stop tracking edits and collapse to offset 0, releasing the control's
   * reference to this range.
   *
   * Optional because it ships in Chromium but is absent from the spec pull
   * requests, so another engine may implement `OpaqueRange` without it.
   */
  disconnect?(): void
}

/**
 * Whether this browser implements `createValueRange()`.
 *
 * True only says the *engine* supports the API. It does not say a given element
 * does — the method exists on `HTMLInputElement.prototype` for every input
 * type and throws at call time for unsupported ones. Use
 * {@link supportsValueRange} for a specific element.
 */
export function isValueRangeSupported(): boolean {
  return (
    typeof HTMLInputElement !== 'undefined' &&
    typeof (HTMLInputElement.prototype as Partial<ValueRangeCreation>)
      .createValueRange === 'function'
  )
}

/**
 * Whether `element` can produce value ranges: a `<textarea>`, or an `<input>`
 * whose `type` is `text`, `search`, `tel`, `url`, or `password`.
 *
 * @param element - Element to test; `null`/`undefined` returns false
 */
export function supportsValueRange(
  element: Element | null | undefined,
): element is ValueRangeElement {
  if (!element || !isValueRangeSupported()) return false
  if (element instanceof HTMLTextAreaElement) return true
  return (
    element instanceof HTMLInputElement &&
    SUPPORTED_INPUT_TYPES.has(element.type)
  )
}

/**
 * Narrow a highlight range to a value range.
 *
 * Tests for "not a DOM `Range`", so it also answers whether reading
 * `startContainer` is safe — on a value range it is `undefined`.
 */
export function isValueRange(range: HighlightRange): range is ValueRange {
  return !(range instanceof Range)
}

/**
 * Create live ranges over `element`'s value for each of `spans`.
 *
 * Offsets are clamped into `[0, element.value.length]` rather than throwing the
 * `IndexSizeError` the API raises for out-of-range offsets, and spans that
 * clamp to nothing are dropped — a collapsed range is never painted.
 *
 * Every returned range holds a reference from `element` until
 * {@link disconnectValueRanges} releases it.
 *
 * @param element - A control {@link supportsValueRange} accepts
 * @param spans - Half-open `[start, end)` character spans
 * @returns One range per non-empty span. Empty when the element is unsupported
 *
 * @example
 * ```ts
 * import { createValueRanges, highlights } from '@cbcruk/highlight-kit'
 *
 * const textarea = document.querySelector('textarea')!
 * const ranges = createValueRanges(textarea, [{ start: 0, end: 5 }])
 * highlights.set('note', 'my-source', ranges)
 * ```
 */
export function createValueRanges(
  element: ValueRangeElement,
  spans: ReadonlyArray<{ start: number; end: number }>,
): ValueRange[] {
  if (!supportsValueRange(element)) return []

  const length = element.value.length
  const host = element as unknown as ValueRangeCreation
  const ranges: ValueRange[] = []

  for (const { start, end } of spans) {
    const from = Math.max(0, Math.min(start, length))
    const to = Math.max(from, Math.min(end, length))
    if (from === to) continue
    try {
      ranges.push(host.createValueRange(from, to))
    } catch {
      /* NotSupportedError / IndexSizeError — drop this span */
    }
  }

  return ranges
}

/**
 * Release `ranges` so their control stops tracking them.
 *
 * Safe to call twice, and on ranges already auto-disconnected by the element
 * being removed or its `type` changing.
 */
export function disconnectValueRanges(ranges: Iterable<ValueRange>): void {
  for (const range of ranges) {
    try {
      range.disconnect?.()
    } catch {
      /* already disconnected */
    }
  }
}

/** Options shared by {@link createValueRangeRegistry} and its wrappers. */
export interface ValueRangeBindingOptions {
  /** The control whose value the ranges point into. */
  element: ValueRangeElement
  /** Controller the ranges are registered with. @default the shared singleton */
  controller?: HighlightController
  /** This binding's identity within each highlight name. @default a fresh symbol */
  sourceId?: SourceId
}

/**
 * Owns one generation of value ranges on a control and swaps it atomically.
 *
 * This is the piece that makes repeated re-matching safe. A control retains
 * every range `createValueRange()` returned and shifts all of their offsets on
 * each edit, so re-registering without releasing the ranges from the previous
 * pass leaves a growing pile of live ranges behind — invisible, because
 * `Highlight` no longer holds them, but still updated on every keystroke.
 * {@link ValueRangeRegistry.commit} disconnects the outgoing generation for you.
 */
export interface ValueRangeRegistry {
  /** Whether the element can actually produce value ranges. */
  readonly supported: boolean
  /** Highlight names this registry currently has ranges registered under. */
  readonly names: readonly string[]
  /**
   * Replace everything this registry owns with ranges for `groups`.
   *
   * Names the registry held but `groups` omits are unregistered. The outgoing
   * ranges are disconnected only after the new ones are committed, so the
   * highlight never blanks for a frame.
   */
  commit(groups: readonly NamedSpans[]): void
  /** Unregister every name and disconnect every range this registry created. */
  dispose(): void
}

/**
 * Create a registry that keeps one generation of value ranges on `element`.
 *
 * Use it when you compute spans yourself; {@link createValueHighlighter} layers
 * the tokenizer and an `input` listener on top.
 *
 * @example Marking a single span and replacing it later
 * ```ts
 * import { createValueRangeRegistry } from '@cbcruk/highlight-kit'
 *
 * const registry = createValueRangeRegistry({ element: textarea })
 * registry.commit([{ name: 'note', priority: 0, spans: [{ start: 0, end: 4 }] }])
 * registry.commit([{ name: 'note', priority: 0, spans: [{ start: 6, end: 9 }] }])
 * registry.dispose()
 * ```
 */
export function createValueRangeRegistry({
  element,
  controller = highlights,
  sourceId = Symbol('value-range-registry'),
}: ValueRangeBindingOptions): ValueRangeRegistry {
  const supported = supportsValueRange(element)
  let owned: ValueRange[] = []
  let names: string[] = []
  let disposed = false

  return {
    supported,
    get names(): readonly string[] {
      return names
    },

    commit(groups): void {
      if (disposed || !supported) return

      const previous = owned
      const next: ValueRange[] = []
      const nextNames: string[] = []

      for (const group of groups) {
        const ranges = createValueRanges(element, group.spans)
        if (ranges.length === 0) continue
        controller.set(group.name, sourceId, ranges, group.priority)
        next.push(...ranges)
        nextNames.push(group.name)
      }

      for (const name of names) {
        if (!nextNames.includes(name)) controller.remove(name, sourceId)
      }

      owned = next
      names = nextNames
      disconnectValueRanges(previous)
    },

    dispose(): void {
      if (disposed) return
      disposed = true
      for (const name of names) controller.remove(name, sourceId)
      disconnectValueRanges(owned)
      owned = []
      names = []
    },
  }
}

/** Options for {@link createValueHighlighter}. */
export interface ValueHighlighterOptions extends ValueRangeBindingOptions {
  /** Ordered token rules. Earlier rules win; see {@link TokenRule}. */
  rules: readonly TokenRule[]
  /**
   * How matches covering the same characters resolve.
   * @default 'first'
   */
  overlap?: OverlapStrategy
  /**
   * Re-tokenize on the element's own `input` events. Turn off to drive
   * {@link ValueHighlighter.refresh} yourself.
   * @default true
   */
  observe?: boolean
}

/** A running tokenizer bound to one form control. */
export interface ValueHighlighter {
  /** Whether the element can actually produce value ranges. */
  readonly supported: boolean
  /** Highlight names that currently have at least one match. */
  readonly names: readonly string[]
  /**
   * Re-tokenize the element's current value and re-register.
   *
   * Call this after assigning `element.value` programmatically: a whole-value
   * assignment collapses every live range to offset 0 and fires no `input`
   * event, so nothing else would notice.
   */
  refresh(): void
  /** Unregister every name and disconnect every range this highlighter created. */
  dispose(): void
}

/**
 * Keep a form control's value tokenized and highlighted.
 *
 * Tokenizes once on creation and then on every `input` event, registering one
 * highlight name per rule name and releasing the previous generation of ranges.
 *
 * Does nothing when the browser or the element is unsupported, so calling it
 * unconditionally is safe — read {@link ValueHighlighter.supported} to decide
 * whether to render a fallback.
 *
 * @example Search-query syntax in a text input
 * ```ts
 * import {
 *   createValueHighlighter,
 *   injectHighlightStyles,
 * } from '@cbcruk/highlight-kit'
 *
 * injectHighlightStyles({
 *   field: { color: '#2563eb' },
 *   quoted: { backgroundColor: '#dbeafe' },
 * })
 *
 * const input = document.querySelector('input')!
 * const highlighter = createValueHighlighter({
 *   element: input,
 *   rules: [
 *     { name: 'quoted', pattern: /"[^"]*"/ },
 *     { name: 'field', pattern: /\b\w+:/ },
 *   ],
 * })
 *
 * highlighter.dispose()
 * ```
 */
export function createValueHighlighter({
  rules,
  overlap,
  observe = true,
  ...binding
}: ValueHighlighterOptions): ValueHighlighter {
  const registry = createValueRangeRegistry(binding)
  const { element } = binding

  function refresh(): void {
    const tokens = tokenizeValue(element.value, rules, { overlap })
    registry.commit(groupTokens(tokens, rules))
  }

  const onInput = (): void => refresh()

  refresh()
  if (registry.supported && observe) {
    element.addEventListener('input', onInput)
  }

  return {
    supported: registry.supported,
    get names(): readonly string[] {
      return registry.names
    },
    refresh,
    dispose(): void {
      element.removeEventListener('input', onInput)
      registry.dispose()
    },
  }
}

/**
 * Scroll `element` just far enough for `range` to be visible inside it.
 *
 * `scrollIntoView()` is not an option: a value range has no node to call it on.
 * This adjusts the control's own `scrollTop`/`scrollLeft` from the range's
 * client rect, and unlike `setSelectionRange()` it leaves the user's selection
 * and focus alone.
 *
 * No-op for a collapsed or disconnected range, whose rect is empty.
 */
export function scrollValueRangeIntoView(
  element: ValueRangeElement,
  range: ValueRange,
): void {
  const target = range.getBoundingClientRect()
  if (target.width === 0 && target.height === 0) return
  const host = element.getBoundingClientRect()

  if (target.top < host.top) {
    element.scrollTop -= host.top - target.top
  } else if (target.bottom > host.bottom) {
    element.scrollTop += target.bottom - host.bottom
  }

  if (target.left < host.left) {
    element.scrollLeft -= host.left - target.left
  } else if (target.right > host.right) {
    element.scrollLeft += target.right - host.right
  }
}
