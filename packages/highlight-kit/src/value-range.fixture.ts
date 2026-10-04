/**
 * Test-only stand-in for `createValueRange()`.
 *
 * jsdom implements neither `OpaqueRange` nor the Custom Highlight API, so these
 * helpers install a fake that mirrors the spec's observable behaviour — it
 * throws `IndexSizeError` for out-of-range offsets and collapses `start > end` —
 * and records every range handed out, so tests can assert that a range was
 * released rather than left live on the element.
 *
 * Not part of the published entry points.
 */

import type { ValueRange } from './value-range'

/** A fake range that remembers whether it was disconnected. */
export interface FakeValueRange extends ValueRange {
  startOffset: number
  endOffset: number
  disconnected: boolean
}

let created: FakeValueRange[] = []

function createFakeRange(
  this: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
): FakeValueRange {
  const length = this.value.length
  if (start > length || end > length) {
    throw new DOMException('offset out of range', 'IndexSizeError')
  }

  const range: FakeValueRange = {
    startOffset: start,
    endOffset: Math.max(start, end),
    get collapsed(): boolean {
      return range.startOffset === range.endOffset
    },
    disconnected: false,
    getClientRects: () => [] as unknown as DOMRectList,
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
    disconnect(): void {
      range.disconnected = true
      range.startOffset = 0
      range.endOffset = 0
    },
  }

  created.push(range)
  return range
}

/** Install the fake on both form-control prototypes and reset the recording. */
export function installValueRangeApi(): void {
  created = []
  for (const ctor of [HTMLInputElement, HTMLTextAreaElement]) {
    Object.defineProperty(ctor.prototype, 'createValueRange', {
      value: createFakeRange,
      configurable: true,
      writable: true,
    })
  }
}

/** Remove the fake, so support detection reports an unsupported browser. */
export function uninstallValueRangeApi(): void {
  for (const ctor of [HTMLInputElement, HTMLTextAreaElement]) {
    delete (ctor.prototype as unknown as Record<string, unknown>)
      .createValueRange
  }
}

/** Every range created since the last install, disconnected ones included. */
export function allValueRanges(): readonly FakeValueRange[] {
  return created
}

/** Ranges the element is still tracking, i.e. never disconnected. */
export function liveValueRanges(): readonly FakeValueRange[] {
  return created.filter((range) => !range.disconnected)
}
