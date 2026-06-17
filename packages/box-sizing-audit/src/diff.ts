import type {
  DiffThresholds,
  ElementSnapshot,
  Finding,
} from './box-sizing-audit.types'

/** `tag.class.class` selector for a snapshot, or just `tag` when unclassed. */
export function selOf(e: Pick<ElementSnapshot, 'tag' | 'cls'>): string {
  return e.cls ? `${e.tag}.${e.cls.trim().split(/\s+/).join('.')}` : e.tag
}

function isOverflowing(e: ElementSnapshot): boolean {
  return e.sw > e.cw + 1 || e.sh > e.ch + 1
}

export interface GeometryDiff {
  findings: Finding[]
  /** ids that pass 1 already reported — pass 2 skips these. */
  flagged: Set<string>
}

/**
 * Pass 1: classify the geometry CONSEQUENCES of the box-sizing flip per element.
 * Overflow introduced/resolved take precedence over reflow/resize.
 */
export function diffGeometry(
  before: ElementSnapshot[],
  after: ElementSnapshot[],
  thresholds: DiffThresholds = {},
): GeometryDiff {
  const { reflowPx = 1 } = thresholds
  const afterMap = new Map(after.map((e) => [e.id, e]))
  const flagged = new Set<string>()
  const findings: Finding[] = []

  for (const b of before) {
    const a = afterMap.get(b.id)
    if (!a || (b.w === 0 && b.h === 0)) continue

    const ofB = isOverflowing(b)
    const ofA = isOverflowing(a)
    const moved =
      Math.abs(a.x - b.x) > reflowPx || Math.abs(a.y - b.y) > reflowPx
    const resized =
      Math.abs(a.w - b.w) > reflowPx || Math.abs(a.h - b.h) > reflowPx

    let kind: Finding['kind'] | null = null
    if (!ofB && ofA) kind = 'OVERFLOW_INTRODUCED'
    else if (ofB && !ofA) kind = 'OVERFLOW_RESOLVED'
    else if (moved) kind = 'REFLOWED'
    else if (resized) kind = 'RESIZED'

    if (kind) {
      flagged.add(b.id)
      findings.push({
        kind,
        sel: selOf(b),
        dw: +(a.w - b.w).toFixed(1),
        dh: +(a.h - b.h).toFixed(1),
        dx: +(a.x - b.x).toFixed(1),
        dy: +(a.y - b.y).toFixed(1),
      })
    }
  }

  return { findings, flagged }
}
