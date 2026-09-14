import { describe, expect, it } from 'vitest'
import { formatCount } from './format-count'

describe('formatCount', () => {
  it('1000 미만의 숫자를 그대로 반환해야 함', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1)).toBe('1')
    expect(formatCount(10)).toBe('10')
    expect(formatCount(100)).toBe('100')
    expect(formatCount(999)).toBe('999')
  })

  it('1000 이상의 숫자를 K로 변환해야 함', () => {
    expect(formatCount(1000)).toBe('1.0K')
    expect(formatCount(1500)).toBe('1.5K')
    expect(formatCount(10000)).toBe('10.0K')
    expect(formatCount(15500)).toBe('15.5K')
  })

  it('1000000 이상의 숫자를 M으로 변환해야 함', () => {
    expect(formatCount(1000000)).toBe('1.0M')
    expect(formatCount(1500000)).toBe('1.5M')
    expect(formatCount(10000000)).toBe('10.0M')
    expect(formatCount(15500000)).toBe('15.5M')
  })

  it('소수점 첫째 자리까지 반올림해야 함', () => {
    expect(formatCount(1234)).toBe('1.2K')
    expect(formatCount(1567)).toBe('1.6K')
    expect(formatCount(1234567)).toBe('1.2M')
    expect(formatCount(1567890)).toBe('1.6M')
  })

  it('반올림 결과가 1000K에 닿으면 M으로 올려야 함', () => {
    expect(formatCount(999949)).toBe('999.9K')
    expect(formatCount(999950)).toBe('1.0M')
    expect(formatCount(999999)).toBe('1.0M')
    expect(formatCount(1000000)).toBe('1.0M')
  })
})
