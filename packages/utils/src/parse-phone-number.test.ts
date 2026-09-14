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
      '유효하지 않은 전화번호 형식입니다',
    )

    expect(() => parsePhoneNumber('abcdefghijk')).toThrow()
    expect(() => parsePhoneNumber('')).toThrow()
  })

  it('휴대폰 식별번호(010·011·016~019)로 시작하면 파싱한다', () => {
    for (const prefix of ['010', '011', '016', '017', '018', '019']) {
      expect(parsePhoneNumber(`${prefix}12345678`).prefix).toBe(prefix)
    }
  })

  it('앞자리가 휴대폰 식별번호가 아니면 예외를 던진다', () => {
    expect(() => parsePhoneNumber('02012345678')).toThrowError(
      '유효하지 않은 전화번호 형식입니다',
    )
    expect(() => parsePhoneNumber('07012345678')).toThrow()
    expect(() => parsePhoneNumber('01212345678')).toThrow()
    expect(() => parsePhoneNumber('01512345678')).toThrow()
    expect(() => parsePhoneNumber('12345678901')).toThrow()
  })

  it('형식은 숫자 11자리가 아니면 예외를 던진다', () => {
    expect(() => parsePhoneNumber('010-1234-5678')).toThrow()
    expect(() => parsePhoneNumber('010 1234 5678')).toThrow()
  })
})
