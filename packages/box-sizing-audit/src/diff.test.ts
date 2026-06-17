import { describe, expect, it } from 'vitest'
import { diffGeometry, selOf } from './diff'
import type { ElementSnapshot } from './box-sizing-audit.types'

function snap(
  partial: Partial<ElementSnapshot> & { id: string },
): ElementSnapshot {
  return {
    tag: 'div',
    cls: '',
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    sw: 100,
    cw: 100,
    sh: 100,
    ch: 100,
    ...partial,
  }
}

describe('selOf', () => {
  it('클래스가 없으면 태그만 반환해야 함', () => {
    expect(selOf({ tag: 'div', cls: '' })).toBe('div')
  })

  it('클래스를 점으로 연결한 선택자를 만들어야 함', () => {
    expect(selOf({ tag: 'section', cls: '  card  primary ' })).toBe(
      'section.card.primary',
    )
  })
})

describe('diffGeometry', () => {
  it('비오버플로 → 오버플로는 OVERFLOW_INTRODUCED(회귀)로 분류해야 함', () => {
    const before = [snap({ id: '1', sw: 100, cw: 100 })]
    const after = [snap({ id: '1', sw: 130, cw: 100 })]

    const { findings, flagged } = diffGeometry(before, after)
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe('OVERFLOW_INTRODUCED')
    expect(flagged.has('1')).toBe(true)
  })

  it('오버플로 → 비오버플로는 OVERFLOW_RESOLVED로 분류해야 함', () => {
    const before = [snap({ id: '1', sw: 130, cw: 100 })]
    const after = [snap({ id: '1', sw: 100, cw: 100 })]

    expect(diffGeometry(before, after).findings[0].kind).toBe(
      'OVERFLOW_RESOLVED',
    )
  })

  it('위치만 바뀌면 REFLOWED로 분류해야 함', () => {
    const before = [snap({ id: '1', x: 0, y: 0 })]
    const after = [snap({ id: '1', x: 12, y: 0 })]

    const f = diffGeometry(before, after).findings[0]
    expect(f.kind).toBe('REFLOWED')
    expect(f.dx).toBe(12)
  })

  it('크기만 바뀌면 RESIZED로 분류해야 함', () => {
    const before = [snap({ id: '1', w: 100 })]
    const after = [snap({ id: '1', w: 108 })]

    const f = diffGeometry(before, after).findings[0]
    expect(f.kind).toBe('RESIZED')
    expect(f.dw).toBe(8)
  })

  it('변화가 없으면 finding이 없어야 함', () => {
    const before = [snap({ id: '1' })]
    const after = [snap({ id: '1' })]
    expect(diffGeometry(before, after).findings).toHaveLength(0)
  })

  it('reflowPx 임계값 미만의 흔들림은 무시해야 함', () => {
    const before = [snap({ id: '1', x: 0 })]
    const after = [snap({ id: '1', x: 0.5 })]
    expect(diffGeometry(before, after).findings).toHaveLength(0)
  })

  it('0 크기 요소와 after에 없는 요소는 건너뛰어야 함', () => {
    const before = [
      snap({ id: 'zero', w: 0, h: 0, x: 5 }),
      snap({ id: 'gone', x: 5 }),
    ]
    const after = [snap({ id: 'zero', w: 0, h: 0, x: 99 })]
    expect(diffGeometry(before, after).findings).toHaveLength(0)
  })
})
