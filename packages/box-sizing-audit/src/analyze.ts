import { diffGeometry } from './diff'
import { detectInternalShifts } from './pixel-shift'
import { countRegressions, sortFindings } from './report'
import type {
  AuditResult,
  DiffThresholds,
  ElementSnapshot,
  PixelCompare,
  RawImage,
} from './box-sizing-audit.types'

/** Captured data passed to {@link analyzeAudit}. */
export interface AnalyzeInput {
  /** Audited page URL, copied to the result. */
  url: string
  /** Flipped selector; `null` is reported as `*`. */
  scope: string | null
  /** Element snapshots before the flip. */
  before: ElementSnapshot[]
  /** Element snapshots after the flip. */
  after: ElementSnapshot[]
  /** Full-page screenshot before the flip. */
  beforeImg: RawImage
  /** Full-page screenshot after the flip. */
  afterImg: RawImage
  /** Pixel comparator that returns the mismatched pixel count. */
  compare: PixelCompare
  /** Diff tolerances. */
  thresholds?: DiffThresholds
}

/**
 * Combine pass 1 (geometry) and pass 2 (internal-shift) into a sorted result.
 * Pure: the browser/pixel dependencies are supplied as plain data + a comparator.
 */
export function analyzeAudit({
  url,
  scope,
  before,
  after,
  beforeImg,
  afterImg,
  compare,
  thresholds,
}: AnalyzeInput): AuditResult {
  const geometry = diffGeometry(before, after, thresholds)
  const shifts = detectInternalShifts(
    before,
    after,
    beforeImg,
    afterImg,
    compare,
    geometry.flagged,
    thresholds,
  )
  const findings = sortFindings([...geometry.findings, ...shifts])

  return {
    url,
    scope: scope ?? '*',
    findings,
    regressions: countRegressions(findings),
  }
}
