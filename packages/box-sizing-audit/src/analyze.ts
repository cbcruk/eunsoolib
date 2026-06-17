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

export interface AnalyzeInput {
  url: string
  scope: string | null
  before: ElementSnapshot[]
  after: ElementSnapshot[]
  beforeImg: RawImage
  afterImg: RawImage
  compare: PixelCompare
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
