import { describe, expect, it } from 'vitest'
import { analyzeAudit } from './analyze'
import type { ElementSnapshot, RawImage } from './box-sizing-audit.types'

function snap(
  partial: Partial<ElementSnapshot> & { id: string },
): ElementSnapshot {
  return {
    tag: 'div',
    cls: '',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    sw: 10,
    cw: 10,
    sh: 10,
    ch: 10,
    ...partial,
  }
}

function blank(width: number, height: number): RawImage {
  return { width, height, data: new Uint8Array(width * height * 4) }
}

describe('analyzeAudit', () => {
  it('geometry와 internal-shift 결과를 합쳐 정렬·집계해야 함', () => {
    const before = [
      snap({ id: 'overflow', x: 0, y: 0, sw: 10, cw: 10 }),
      snap({ id: 'stable', x: 20, y: 20 }),
    ]
    const after = [
      snap({ id: 'overflow', x: 0, y: 0, sw: 40, cw: 10 }),
      snap({ id: 'stable', x: 20, y: 20 }),
    ]

    const result = analyzeAudit({
      url: 'http://x',
      scope: null,
      before,
      after,
      beforeImg: blank(60, 60),
      afterImg: blank(60, 60),
      compare: () => 50, // stable 박스(100px)의 50% → INTERNAL_SHIFT
    })

    expect(result.scope).toBe('*')
    expect(result.findings.map((f) => f.kind)).toEqual([
      'OVERFLOW_INTRODUCED',
      'INTERNAL_SHIFT',
    ])
    expect(result.regressions).toBe(2)
  })

  it('scope를 명시하면 결과에 그대로 반영해야 함', () => {
    const result = analyzeAudit({
      url: 'http://x',
      scope: 'main',
      before: [snap({ id: '1' })],
      after: [snap({ id: '1' })],
      beforeImg: blank(20, 20),
      afterImg: blank(20, 20),
      compare: () => 0,
    })
    expect(result.scope).toBe('main')
    expect(result.findings).toHaveLength(0)
    expect(result.regressions).toBe(0)
  })
})
