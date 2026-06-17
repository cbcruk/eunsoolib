import { selOf } from './diff'
import type {
  DiffThresholds,
  ElementSnapshot,
  Finding,
  PixelCompare,
  RawImage,
} from './box-sizing-audit.types'

/**
 * Copy an (x,y,w,h) region out of a RawImage into a fresh same-size RGBA buffer.
 * Coordinates are clamped to the source bounds; returns null for an empty region.
 */
export function crop(
  img: RawImage,
  x: number,
  y: number,
  w: number,
  h: number,
): RawImage | null {
  const ix = Math.max(0, Math.round(x))
  const iy = Math.max(0, Math.round(y))
  const iw = Math.min(Math.round(w), img.width - ix)
  const ih = Math.min(Math.round(h), img.height - iy)
  if (iw <= 0 || ih <= 0) return null

  const out = new Uint8Array(iw * ih * 4)
  for (let row = 0; row < ih; row++) {
    const s = ((iy + row) * img.width + ix) * 4
    out.set(img.data.subarray(s, s + iw * 4), row * iw * 4)
  }
  return { width: iw, height: ih, data: out }
}

function isStable(
  a: ElementSnapshot,
  b: ElementSnapshot,
  stablePx: number,
): boolean {
  return (
    Math.abs(a.x - b.x) <= stablePx &&
    Math.abs(a.y - b.y) <= stablePx &&
    Math.abs(a.w - b.w) <= stablePx &&
    Math.abs(a.h - b.h) <= stablePx
  )
}

/**
 * Pass 2: pixel-diff boxes that DIDN'T move (geometry's blind spot). Only
 * same-size crops are comparable, so we compare in-place regions and flag when
 * the mismatch ratio exceeds `diffRatio`. `flagged` ids from pass 1 are skipped.
 */
export function detectInternalShifts(
  before: ElementSnapshot[],
  after: ElementSnapshot[],
  beforeImg: RawImage,
  afterImg: RawImage,
  compare: PixelCompare,
  flagged: Set<string> = new Set(),
  thresholds: DiffThresholds = {},
): Finding[] {
  const { stablePx = 1, diffRatio = 0.02 } = thresholds
  const afterMap = new Map(after.map((e) => [e.id, e]))
  const findings: Finding[] = []

  for (const b of before) {
    if (flagged.has(b.id) || b.w < 2 || b.h < 2) continue
    const a = afterMap.get(b.id)
    if (!a || !isStable(a, b, stablePx)) continue

    const cb = crop(beforeImg, b.x, b.y, b.w, b.h)
    const ca = crop(afterImg, b.x, b.y, b.w, b.h)
    if (!cb || !ca) continue

    const mismatched = compare(cb.data, ca.data, cb.width, cb.height)
    const ratio = mismatched / (cb.width * cb.height)
    if (ratio > diffRatio) {
      findings.push({
        kind: 'INTERNAL_SHIFT',
        sel: selOf(b),
        ratio: +(ratio * 100).toFixed(1),
      })
    }
  }

  return findings
}
