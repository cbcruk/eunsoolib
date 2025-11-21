import { describe, expect, test } from 'vitest'

describe('formatCount', () => {
  test('1000 미만의 숫자를 그대로 반환한다', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1)).toBe('1')
    expect(formatCount(10)).toBe('10')
    expect(formatCount(100)).toBe('100')
    expect(formatCount(999)).toBe('999')
  })

  test('1000 이상의 숫자를 K로 변환한다', () => {
    expect(formatCount(1000)).toBe('1.0K')
    expect(formatCount(1500)).toBe('1.5K')
    expect(formatCount(10000)).toBe('10.0K')
    expect(formatCount(15500)).toBe('15.5K')
  })

  test('1000000 이상의 숫자를 M으로 변환한다', () => {
    expect(formatCount(1000000)).toBe('1.0M')
    expect(formatCount(1500000)).toBe('1.5M')
    expect(formatCount(10000000)).toBe('10.0M')
    expect(formatCount(15500000)).toBe('15.5M')
  })

  test('경계값을 올바르게 처리한다', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1000)).toBe('1.0K')
    expect(formatCount(999999)).toBe('1000.0K')
    expect(formatCount(1000000)).toBe('1.0M')
  })

  test('소수점 첫째 자리까지 반올림한다', () => {
    expect(formatCount(1234)).toBe('1.2K')
    expect(formatCount(1567)).toBe('1.6K')
    expect(formatCount(1234567)).toBe('1.2M')
    expect(formatCount(1567890)).toBe('1.6M')
  })
})
function formatCount(arg0: number): any {
  throw new Error('Function not implemented.')
}
