import { describe, expect, test } from 'vitest'
import { formatDuration } from './format-duration'

describe('formatDuration', () => {
  test('0초를 00:00으로 변환한다', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  test('60초 미만을 올바르게 변환한다', () => {
    expect(formatDuration(5)).toBe('00:05')
    expect(formatDuration(30)).toBe('00:30')
    expect(formatDuration(59)).toBe('00:59')
  })

  test('정확히 60초를 01:00으로 변환한다', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  test('60초 이상을 올바르게 변환한다', () => {
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(125)).toBe('02:05')
    expect(formatDuration(226)).toBe('03:46')
  })

  test('10분 이상을 올바르게 변환한다', () => {
    expect(formatDuration(600)).toBe('10:00')
    expect(formatDuration(665)).toBe('11:05')
  })

  test('1시간 이상을 올바르게 변환한다', () => {
    expect(formatDuration(3600)).toBe('60:00')
    expect(formatDuration(3665)).toBe('61:05')
  })

  test('소수점', () => {
    expect(formatDuration(31.997098)).toBe('00:31')
  })
})
