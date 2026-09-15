import { describe, expect, it } from 'vitest'
import { formatTimeFromSeconds } from './format-time-from-seconds'

describe('formatTimeFromSeconds', () => {
  it('초를 시간·분·초 문자열로 변환하고 0인 단위는 생략해야 함', () => {
    expect(formatTimeFromSeconds(1)).toMatchInlineSnapshot(`"1초"`)
    expect(formatTimeFromSeconds(90)).toMatchInlineSnapshot(`"1분 30초"`)
    expect(formatTimeFromSeconds(3600)).toMatchInlineSnapshot(`"1시간"`)
    expect(formatTimeFromSeconds(3601)).toMatchInlineSnapshot(`"1시간 1초"`)
    expect(formatTimeFromSeconds(3701)).toMatchInlineSnapshot(
      `"1시간 1분 41초"`,
    )
  })

  it('0이면 빈 문자열을 반환해야 함', () => {
    expect(formatTimeFromSeconds(0)).toBe('')
  })

  it('음수이면 RangeError를 던져야 함', () => {
    expect(() => formatTimeFromSeconds(-1)).toThrow(RangeError)
    expect(() => formatTimeFromSeconds(-3600)).toThrow(RangeError)
  })

  it('정수가 아니면 RangeError를 던져야 함', () => {
    expect(() => formatTimeFromSeconds(1.5)).toThrow(RangeError)
    expect(() => formatTimeFromSeconds(Number.NaN)).toThrow(RangeError)
    expect(() => formatTimeFromSeconds(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    )
  })
})
