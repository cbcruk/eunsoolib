import { describe, expect, it } from 'vitest'
import {
  downsampleDimensions,
  asUint32,
  analyzePerimeter,
  scanPixels,
  calculateNormalizedDimensions,
  getVisualCenterTransform,
  type MeasurementResult,
} from './logo-soup-utils'

const WHITE = packPixel(255, 255, 255, 255)
const BLACK = packPixel(0, 0, 0, 255)
const TRANSPARENT = packPixel(0, 0, 0, 0)

/** RGBA → little-endian 0xAABBGGRR 워드 */
function packPixel(r: number, g: number, b: number, a: number): number {
  return (((a << 24) | (b << 16) | (g << 8) | r) >>> 0) as number
}

/** sw×sh 단색 이미지 생성 (기본 흰색 불투명) */
function makeImage(sw: number, sh: number, fill = WHITE): Uint32Array {
  return new Uint32Array(sw * sh).fill(fill)
}

function setPixel(
  img: Uint32Array,
  sw: number,
  x: number,
  y: number,
  value: number,
): void {
  img[y * sw + x] = value
}

describe('downsampleDimensions', () => {
  it('픽셀 예산 이하면 크기를 그대로 유지해야 함', () => {
    expect(downsampleDimensions(40, 40)).toEqual({ sw: 40, sh: 40 })
  })

  it('예산을 넘으면 면적이 예산 이하가 되도록 비율을 유지하며 축소해야 함', () => {
    const { sw, sh } = downsampleDimensions(100, 100)
    expect(sw).toBe(45)
    expect(sh).toBe(45)
    expect(sw * sh).toBeLessThanOrEqual(2048)
  })

  it('축소해도 종횡비를 유지해야 함', () => {
    const { sw, sh } = downsampleDimensions(4000, 1000)
    expect(sw / sh).toBeCloseTo(4, 1)
    expect(sw * sh).toBeLessThanOrEqual(Math.round(2048 * 1.1))
  })

  it('최소 1px를 보장해야 함', () => {
    expect(downsampleDimensions(1, 1)).toEqual({ sw: 1, sh: 1 })
  })
})

describe('asUint32', () => {
  it('RGBA 바이트를 리틀엔디언 워드(0xAABBGGRR)로 읽어야 함', () => {
    const bytes = new Uint8ClampedArray([0x11, 0x22, 0x33, 0x44])
    expect(asUint32(bytes)[0]).toBe(0x44332211)
  })
})

describe('analyzePerimeter', () => {
  it('불투명 테두리의 최빈색을 배경색으로 추정해야 함', () => {
    const img = makeImage(4, 4, WHITE)
    const result = analyzePerimeter(img, 4, 4)

    expect(result.transparent).toBe(false)
    expect(result.bgR).toBe(255)
    expect(result.bgG).toBe(255)
    expect(result.bgB).toBe(255)
  })

  it('테두리의 10% 넘게 투명하면 transparent로 판단해야 함', () => {
    const img = makeImage(4, 4, TRANSPARENT)
    const result = analyzePerimeter(img, 4, 4)

    expect(result.transparent).toBe(true)
  })
})

describe('scanPixels', () => {
  it('불투명 배경 위 콘텐츠의 bbox와 배경휘도를 계산해야 함', () => {
    const sw = 8
    const sh = 8
    const img = makeImage(sw, sh, WHITE)
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        setPixel(img, sw, x, y, BLACK)
      }
    }

    const result = scanPixels({ width: sw, height: sh, data32: img, sw, sh })

    expect(result.contentBox).toEqual({ x: 2, y: 2, width: 4, height: 4 })
    expect(result.visualCenter.x).toBeCloseTo(4, 5)
    expect(result.visualCenter.y).toBeCloseTo(4, 5)
    expect(result.visualCenter.offsetX).toBeCloseTo(0, 5)
    expect(result.visualCenter.offsetY).toBeCloseTo(0, 5)
    expect(result.backgroundLuminance).toBeCloseTo(1, 5)
  })

  it('비대칭 콘텐츠는 시각중심 오프셋이 기하중심과 달라야 함', () => {
    const sw = 8
    const sh = 8
    const img = makeImage(sw, sh, WHITE)
    setPixel(img, sw, 2, 2, BLACK)
    setPixel(img, sw, 2, 3, BLACK)
    setPixel(img, sw, 2, 4, BLACK)
    setPixel(img, sw, 5, 2, BLACK)

    const result = scanPixels({ width: sw, height: sh, data32: img, sw, sh })

    expect(result.contentBox).toEqual({ x: 2, y: 2, width: 4, height: 3 })
    expect(result.visualCenter.offsetX).toBeCloseTo(-0.75, 5)
    expect(result.visualCenter.offsetY).toBeCloseTo(-0.25, 5)
  })

  it('투명 배경 이미지는 alphaOnly 경로로 처리하고 배경휘도를 내지 않아야 함', () => {
    const sw = 8
    const sh = 8
    const img = makeImage(sw, sh, TRANSPARENT)
    for (let y = 3; y <= 4; y++) {
      for (let x = 3; x <= 4; x++) {
        setPixel(img, sw, x, y, WHITE)
      }
    }

    const result = scanPixels({ width: sw, height: sh, data32: img, sw, sh })

    expect(result.contentBox).toEqual({ x: 3, y: 3, width: 2, height: 2 })
    expect(result.backgroundLuminance).toBeUndefined()
  })

  it('콘텐츠가 없으면 전체 이미지로 폴백해야 함', () => {
    const sw = 6
    const sh = 6
    const img = makeImage(sw, sh, WHITE)

    const result = scanPixels({
      width: sw,
      height: sh,
      data32: img,
      sw,
      sh,
      includeDensity: true,
    })

    expect(result.contentBox).toEqual({ x: 0, y: 0, width: 6, height: 6 })
    expect(result.visualCenter).toEqual({ x: 3, y: 3, offsetX: 0, offsetY: 0 })
    expect(result.pixelDensity).toBe(0.5)
  })

  it('includeDensity는 채움면적비 × 평균불투명도를 계산해야 함', () => {
    const sw = 8
    const sh = 8
    const img = makeImage(sw, sh, WHITE)
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        setPixel(img, sw, x, y, BLACK)
      }
    }

    const result = scanPixels({
      width: sw,
      height: sh,
      data32: img,
      sw,
      sh,
      includeDensity: true,
    })

    expect(result.pixelDensity).toBeCloseTo(1, 5)
  })
})

describe('calculateNormalizedDimensions', () => {
  function measurement(cw: number, ch: number): MeasurementResult {
    return {
      width: cw,
      height: ch,
      contentBox: { x: 0, y: 0, width: cw, height: ch },
      visualCenter: { x: cw / 2, y: ch / 2, offsetX: 0, offsetY: 0 },
    }
  }

  it('정사각형 콘텐츠는 baseSize로 정규화돼야 함', () => {
    expect(calculateNormalizedDimensions(measurement(100, 100))).toEqual({
      width: 48,
      height: 48,
    })
  })

  it('종횡비를 scaleFactor(0.5)로 감쇠해야 함', () => {
    expect(calculateNormalizedDimensions(measurement(400, 100))).toEqual({
      width: 96,
      height: 24,
    })
  })

  it('배경휘도가 있으면 조사 착시 보정으로 약간 줄여야 함', () => {
    const m: MeasurementResult = {
      ...measurement(100, 100),
      backgroundLuminance: 0,
      pixelDensity: 0.5,
    }
    expect(calculateNormalizedDimensions(m)).toEqual({ width: 46, height: 46 })
  })

  it('densityFactor가 켜지면 기준밀도보다 진한 로고를 축소해야 함', () => {
    const m: MeasurementResult = {
      ...measurement(100, 100),
      pixelDensity: 0.7,
    }
    expect(calculateNormalizedDimensions(m, { densityFactor: 1 })).toEqual({
      width: 34,
      height: 34,
    })
  })

  it('콘텐츠 크기가 0이면 baseSize 정사각형을 반환해야 함', () => {
    const m: MeasurementResult = {
      width: 0,
      height: 0,
      contentBox: { x: 0, y: 0, width: 0, height: 0 },
      visualCenter: { x: 0, y: 0, offsetX: 0, offsetY: 0 },
    }
    expect(calculateNormalizedDimensions(m, { baseSize: 48 })).toEqual({
      width: 48,
      height: 48,
    })
  })
})

describe('getVisualCenterTransform', () => {
  function measurement(offsetX: number, offsetY: number): MeasurementResult {
    return {
      width: 100,
      height: 100,
      contentBox: { x: 0, y: 0, width: 100, height: 100 },
      visualCenter: { x: 50, y: 50, offsetX, offsetY },
    }
  }

  it('bounds 모드는 보정하지 않아야 함', () => {
    expect(
      getVisualCenterTransform(measurement(10, 10), 50, 50, 'bounds'),
    ).toBeUndefined()
  })

  it('기본값(visual-center-y)은 세로 오프셋만 반영해야 함', () => {
    expect(getVisualCenterTransform(measurement(10, 10), 50, 50)).toBe(
      'translate(0px, -5px)',
    )
  })

  it('visual-center는 가로·세로 오프셋을 모두 반영해야 함', () => {
    expect(
      getVisualCenterTransform(measurement(10, 20), 50, 50, 'visual-center'),
    ).toBe('translate(-5px, -10px)')
  })

  it('0.5px 미만의 미세 이동은 무시해야 함', () => {
    expect(
      getVisualCenterTransform(measurement(0.5, 0.5), 50, 50, 'visual-center'),
    ).toBeUndefined()
  })
})
