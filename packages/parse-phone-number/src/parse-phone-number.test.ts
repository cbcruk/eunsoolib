import { describe, it, expect } from 'vitest'
import { parsePhoneNumber } from './parse-phone-number'

describe('parsePhoneNumber', () => {
  it('정상적인 전화번호를 잘 파싱한다', () => {
    const result = parsePhoneNumber('01012345678')

    expect(result).toEqual({
      prefix: '010',
      middle: '1234',
      suffix: '5678',
    })
  })

  it('유효하지 않은 전화번호를 입력하면 예외를 던진다', () => {
    expect(() => parsePhoneNumber('0101234567')).toThrowError(
      '유효하지 않은 전화번호 형식입니다'
    )

    expect(() => parsePhoneNumber('abcdefghijk')).toThrow()
    expect(() => parsePhoneNumber('')).toThrow()
  })

  it('형식은 숫자 11자리가 아니면 예외를 던진다', () => {
    expect(() => parsePhoneNumber('010-1234-5678')).toThrow()
    expect(() => parsePhoneNumber('010 1234 5678')).toThrow()
  })
})
