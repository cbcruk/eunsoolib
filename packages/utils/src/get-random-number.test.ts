import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRandomNumber } from './get-random-number'

describe('getRandomNumber', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('min 이상 max 이하의 정수를 반환해야 함', () => {
    const min = 1
    const max = 10

    for (let i = 0; i < 100; i++) {
      const value = getRandomNumber({ min, max })

      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(min)
      expect(value).toBeLessThanOrEqual(max)
    }
  })

  it('양 끝 값을 모두 반환할 수 있어야 함', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0)
    expect(getRandomNumber({ min: -2, max: 2 })).toBe(-2)

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999999)
    expect(getRandomNumber({ min: -2, max: 2 })).toBe(2)
  })

  it('min과 max가 같으면 그 값을 반환해야 함', () => {
    expect(getRandomNumber({ min: 3, max: 3 })).toBe(3)
  })

  it('min이 max보다 크면 RangeError를 던져야 함', () => {
    expect(() => getRandomNumber({ min: 10, max: 1 })).toThrow(RangeError)
  })

  it('min이나 max가 정수가 아니면 RangeError를 던져야 함', () => {
    expect(() => getRandomNumber({ min: 0.5, max: 2 })).toThrow(RangeError)
    expect(() => getRandomNumber({ min: 0, max: 2.5 })).toThrow(RangeError)
    expect(() => getRandomNumber({ min: Number.NaN, max: 2 })).toThrow(
      RangeError,
    )
    expect(() =>
      getRandomNumber({ min: 0, max: Number.POSITIVE_INFINITY }),
    ).toThrow(RangeError)
  })
})
