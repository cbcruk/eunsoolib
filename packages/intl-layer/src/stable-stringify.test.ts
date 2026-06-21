import { describe, expect, it } from 'vitest'
import { stableStringify } from './stable-stringify'

describe('stableStringify', () => {
  it('키 순서가 달라도 같은 문자열을 내야 함', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(
      stableStringify({ b: 2, a: 1 }),
    )
  })

  it('중첩 객체도 정규화해야 함', () => {
    expect(stableStringify({ x: { p: 1, q: 2 } })).toBe(
      stableStringify({ x: { q: 2, p: 1 } }),
    )
  })

  it('배열 순서는 유지해야 함', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]')
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]))
  })

  it('undefined 프로퍼티는 제외해야 함', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('원시값을 JSON으로 직렬화해야 함', () => {
    expect(stableStringify('ko')).toBe('"ko"')
    expect(stableStringify(42)).toBe('42')
    expect(stableStringify(null)).toBe('null')
  })

  it('Intl 옵션의 키 순서 차이를 같은 키로 만들어야 함', () => {
    const a = { style: 'currency', currency: 'USD' }
    const b = { currency: 'USD', style: 'currency' }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })
})
