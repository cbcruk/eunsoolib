/** page-coordinate geometry + scroll/client metrics captured per element. */
export interface ElementSnapshot {
  id: string
  tag: string
  cls: string
  x: number
  y: number
  w: number
  h: number
  /** scrollWidth */
  sw: number
  /** clientWidth */
  cw: number
  /** scrollHeight */
  sh: number
  /** clientHeight */
  ch: number
}

export type FindingKind =
  | 'OVERFLOW_INTRODUCED'
  | 'INTERNAL_SHIFT'
  | 'REFLOWED'
  | 'RESIZED'
  | 'OVERFLOW_RESOLVED'

export interface Finding {
  kind: FindingKind
  sel: string
  dw?: number
  dh?: number
  dx?: number
  dy?: number
  /** INTERNAL_SHIFT: percentage of pixels that differ. */
  ratio?: number
}

export interface DiffThresholds {
  /** sub-pixel jitter ignored in pass 1. Default 1. */
  reflowPx?: number
  /** max drift for a box to be considered "unchanged" in pass 2. Default 1. */
  stablePx?: number
  /** pass 2 flags when more than this fraction of pixels differ. Default 0.02. */
  diffRatio?: number
}

/** decoded image as a flat RGBA byte buffer. */
export interface RawImage {
  width: number
  height: number
  data: Uint8Array
}

/** returns the number of mismatched pixels between two equally-sized RGBA buffers. */
export type PixelCompare = (
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
) => number

export interface Viewport {
  width: number
  height: number
}

export interface AuditOptions {
  url: string
  /** CSS selector to flip; null/undefined flips the whole page (`*`). */
  scope?: string | null
  viewport?: Viewport
  thresholds?: DiffThresholds
}

export interface AuditResult {
  url: string
  scope: string
  findings: Finding[]
  /** count of findings considered likely regressions. */
  regressions: number
}

export interface CliArgs {
  url: string | null
  scope: string | null
  viewport: Viewport
  json: boolean
}
