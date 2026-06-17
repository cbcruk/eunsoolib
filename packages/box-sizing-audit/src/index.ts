export { boxSizingAudit } from './box-sizing-audit'

export { analyzeAudit, type AnalyzeInput } from './analyze'

export { diffGeometry, selOf, type GeometryDiff } from './diff'

export { crop, detectInternalShifts } from './pixel-shift'

export {
  sortFindings,
  isRegression,
  countRegressions,
  formatReport,
} from './report'

export { parseArgs, buildFlipCss } from './cli'

export type {
  AuditOptions,
  AuditResult,
  CliArgs,
  DiffThresholds,
  ElementSnapshot,
  Finding,
  FindingKind,
  PixelCompare,
  RawImage,
  Viewport,
} from './box-sizing-audit.types'
