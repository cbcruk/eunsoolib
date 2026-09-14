/** page-coordinate geometry + scroll/client metrics captured per element. */
export interface ElementSnapshot {
  /** Identifier that matches the same element across the before/after snapshots. */
  id: string
  /** Lowercase tag name. */
  tag: string
  /** Raw `class` attribute value (empty string when absent). */
  cls: string
  /** Left edge in page coordinates (px). */
  x: number
  /** Top edge in page coordinates (px). */
  y: number
  /** Border-box width (px). */
  w: number
  /** Border-box height (px). */
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

/**
 * Category of a layout change caused by the box-sizing flip.
 *
 * `OVERFLOW_INTRODUCED` and `INTERNAL_SHIFT` count as regressions.
 */
export type FindingKind =
  | 'OVERFLOW_INTRODUCED'
  | 'INTERNAL_SHIFT'
  | 'REFLOWED'
  | 'RESIZED'
  | 'OVERFLOW_RESOLVED'

/** A single element whose layout changed after the box-sizing flip. */
export interface Finding {
  /** Category of the change. */
  kind: FindingKind
  /** `tag.class.class` selector of the element (see `selOf`). */
  sel: string
  /** Width change (after − before, px, rounded to 0.1). Set for geometry findings. */
  dw?: number
  /** Height change (after − before, px, rounded to 0.1). Set for geometry findings. */
  dh?: number
  /** Horizontal position change (after − before, px, rounded to 0.1). Set for geometry findings. */
  dx?: number
  /** Vertical position change (after − before, px, rounded to 0.1). Set for geometry findings. */
  dy?: number
  /** INTERNAL_SHIFT: percentage of pixels that differ. */
  ratio?: number
}

/** Tolerances for the geometry pass (pass 1) and the pixel pass (pass 2). */
export interface DiffThresholds {
  /** sub-pixel jitter ignored in pass 1. @default 1 */
  reflowPx?: number
  /** max drift for a box to be considered "unchanged" in pass 2. @default 1 */
  stablePx?: number
  /** pass 2 flags when more than this fraction of pixels differ. @default 0.02 */
  diffRatio?: number
}

/** decoded image as a flat RGBA byte buffer. */
export interface RawImage {
  /** Image width (px). */
  width: number
  /** Image height (px). */
  height: number
  /** RGBA bytes, row by row (`width * height * 4` long). */
  data: Uint8Array
}

/** returns the number of mismatched pixels between two equally-sized RGBA buffers. */
export type PixelCompare = (
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
) => number

/** Browser viewport size. */
export interface Viewport {
  /** Viewport width (px). */
  width: number
  /** Viewport height (px). */
  height: number
}

/** Options for `boxSizingAudit`. */
export interface AuditOptions {
  /** Page URL to audit. */
  url: string
  /** CSS selector to flip; null/undefined flips the whole page (`*`). */
  scope?: string | null
  /** Browser viewport size. @default { width: 1280, height: 800 } */
  viewport?: Viewport
  /** Diff tolerances. */
  thresholds?: DiffThresholds
}

/** Result of an audit. */
export interface AuditResult {
  /** Audited page URL. */
  url: string
  /** Selector that was flipped; `*` for the whole page. */
  scope: string
  /** Findings sorted by severity (see `sortFindings`). */
  findings: Finding[]
  /** count of findings considered likely regressions. */
  regressions: number
}

/** Arguments parsed from the command line by `parseArgs`. */
export interface CliArgs {
  /** First `http://` or `https://` argument, or `null` when none is given. */
  url: string | null
  /** Value of `--scope`, or `null` when omitted. */
  scope: string | null
  /** Parsed `--viewport WxH`; each missing or invalid dimension falls back to 1280 or 800. */
  viewport: Viewport
  /** Whether `--json` was passed. */
  json: boolean
}
