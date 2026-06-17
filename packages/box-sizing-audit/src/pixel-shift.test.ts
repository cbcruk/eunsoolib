import { describe, expect, it, vi } from 'vitest'
import { crop, detectInternalShifts } from './pixel-shift'
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

/** solid grey RawImage of the given size. */
function blank(width: number, height: number): RawImage {
  return { width, height, data: new Uint8Array(width * height * 4) }
}

describe('crop', () => {
  it('지정한 영역의 픽셀만 새 버퍼로 복사해야 함', () => {
    const data = new Uint8Array(4 * 2 * 4)
    for (let i = 0; i < 8; i++) data[i * 4] = i // R 채널에 인덱스 기록
    const img: RawImage = { width: 4, height: 2, data }

    const out = crop(img, 1, 0, 2, 2)
    expect(out).not.toBeNull()
    expect(out!.width).toBe(2)
    expect(out!.height).toBe(2)
    expect([out!.data[0], out!.data[4], out!.data[8], out!.data[12]]).toEqual([
      1, 2, 5, 6,
    ])
  })

  it('경계를 벗어나는 폭은 소스 범위로 잘라내야 함', () => {
    const out = crop(blank(10, 10), 8, 0, 5, 4)
    expect(out!.width).toBe(2)
    expect(out!.height).toBe(4)
  })

  it('빈 영역은 null을 반환해야 함', () => {
    expect(crop(blank(10, 10), 10, 0, 5, 5)).toBeNull()
  })
})

describe('detectInternalShifts', () => {
  const before = [snap({ id: '1', x: 0, y: 0, w: 10, h: 10 })]
  const after = [snap({ id: '1', x: 0, y: 0, w: 10, h: 10 })]

  it('안정된 박스의 픽셀 차이가 임계값을 넘으면 INTERNAL_SHIFT로 보고해야 함', () => {
    const compare = vi.fn(() => 5) // 100px 중 5px → 5%
    const findings = detectInternalShifts(
      before,
      after,
      blank(20, 20),
      blank(20, 20),
      compare,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe('INTERNAL_SHIFT')
    expect(findings[0].ratio).toBe(5)
  })

  it('픽셀 차이가 임계값 이하면 보고하지 않아야 함', () => {
    const compare = vi.fn(() => 1) // 1% < 2%
    expect(
      detectInternalShifts(
        before,
        after,
        blank(20, 20),
        blank(20, 20),
        compare,
      ),
    ).toHaveLength(0)
  })

  it('pass 1에서 이미 flagged된 id는 건너뛰어야 함', () => {
    const compare = vi.fn(() => 100)
    const findings = detectInternalShifts(
      before,
      after,
      blank(20, 20),
      blank(20, 20),
      compare,
      new Set(['1']),
    )
    expect(findings).toHaveLength(0)
    expect(compare).not.toHaveBeenCalled()
  })

  it('stablePx를 넘어 이동한 박스는 비교하지 않아야 함', () => {
    const moved = [snap({ id: '1', x: 5 })]
    const compare = vi.fn(() => 100)
    expect(
      detectInternalShifts(
        before,
        moved,
        blank(20, 20),
        blank(20, 20),
        compare,
      ),
    ).toHaveLength(0)
    expect(compare).not.toHaveBeenCalled()
  })

  it('2px 미만의 작은 박스는 건너뛰어야 함', () => {
    const tiny = [snap({ id: '1', w: 1, h: 1 })]
    const compare = vi.fn(() => 100)
    expect(
      detectInternalShifts(tiny, tiny, blank(20, 20), blank(20, 20), compare),
    ).toHaveLength(0)
  })
})
