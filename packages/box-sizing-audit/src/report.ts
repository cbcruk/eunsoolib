import type {
  AuditResult,
  Finding,
  FindingKind,
} from './box-sizing-audit.types'

const ORDER: Record<FindingKind, number> = {
  OVERFLOW_INTRODUCED: 0,
  INTERNAL_SHIFT: 1,
  REFLOWED: 2,
  RESIZED: 3,
  OVERFLOW_RESOLVED: 4,
}

const LABELS: Record<FindingKind, string> = {
  OVERFLOW_INTRODUCED: '⚠  Overflow introduced (regression)',
  INTERNAL_SHIFT: '⚠  Internal shift — box same, pixels moved (regression)',
  REFLOWED: '→  Repositioned (reflow)',
  RESIZED: '·  Resized, no overflow/reflow (probably safe)',
  OVERFLOW_RESOLVED: '✓  Overflow resolved (border-box fixed a bug)',
}

/** OVERFLOW_INTRODUCED and INTERNAL_SHIFT are the regression-worthy kinds. */
export function isRegression(f: Finding): boolean {
  return f.kind === 'OVERFLOW_INTRODUCED' || f.kind === 'INTERNAL_SHIFT'
}

export function countRegressions(findings: Finding[]): number {
  return findings.filter(isRegression).length
}

/** Sort by severity, then by largest pixel-shift ratio within a kind. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (x, y) => ORDER[x.kind] - ORDER[y.kind] || (y.ratio ?? 0) - (x.ratio ?? 0),
  )
}

function detailOf(f: Finding): string {
  if (f.kind === 'INTERNAL_SHIFT') return `${f.ratio}% px`
  if (f.kind === 'REFLOWED') return `Δx=${f.dx} Δy=${f.dy}`
  return `Δw=${f.dw} Δh=${f.dh}`
}

/** Human-readable report grouped by kind, mirroring the CLI output. */
export function formatReport(result: AuditResult, viewportLabel = ''): string {
  const { url, scope, findings } = result
  const lines: string[] = [
    '',
    `box-sizing audit  ${url}`,
    `scope: ${scope}${viewportLabel ? `   viewport: ${viewportLabel}` : ''}`,
    '='.repeat(66),
  ]

  if (!findings.length) {
    lines.push('', 'No layout changes — safe to migrate this scope.', '')
    return lines.join('\n')
  }

  const sorted = sortFindings(findings)
  for (const kind of Object.keys(ORDER) as FindingKind[]) {
    const group = sorted.filter((f) => f.kind === kind)
    if (!group.length) continue
    lines.push('', `${LABELS[kind]}  —  ${group.length}`)
    for (const f of group.slice(0, 15)) {
      lines.push(`   ${f.sel.slice(0, 50).padEnd(50)} ${detailOf(f)}`)
    }
    if (group.length > 15) lines.push(`   …and ${group.length - 15} more`)
  }
  lines.push('', `${countRegressions(findings)} likely regression(s).`, '')
  return lines.join('\n')
}
