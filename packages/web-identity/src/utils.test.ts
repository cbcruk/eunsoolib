import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  toBase64URL,
  fromBase64URL,
  wrapError,
  assertCredentialsAPI,
} from './utils'
import { WebIdentityError } from './types'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('toBase64URL / fromBase64URL', () => {
  it('바이트를 손실 없이 왕복 변환해야 함', () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 250, 255])
    const encoded = toBase64URL(bytes)

    expect(encoded).not.toMatch(/[+/=]/)
    expect(Array.from(fromBase64URL(encoded))).toEqual(Array.from(bytes))
  })

  it('ArrayBuffer 입력도 받아야 함', () => {
    const buffer = new Uint8Array([72, 73, 33]).buffer
    expect(Array.from(fromBase64URL(toBase64URL(buffer)))).toEqual([72, 73, 33])
  })

  it('URL-safe 문자만 출력해야 함 (+,/,= 없음)', () => {
    const bytes = new Uint8Array([0xfb, 0xef, 0xbe])
    expect(toBase64URL(bytes)).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('wrapError', () => {
  it('DOMException 이름을 에러 코드로 매핑해야 함', () => {
    expect(wrapError(new DOMException('x', 'NotAllowedError')).code).toBe(
      'NOT_ALLOWED',
    )
    expect(wrapError(new DOMException('x', 'AbortError')).code).toBe('ABORTED')
    expect(wrapError(new DOMException('x', 'SecurityError')).code).toBe(
      'SECURITY_ERROR',
    )
    expect(wrapError(new DOMException('x', 'NotSupportedError')).code).toBe(
      'NOT_SUPPORTED',
    )
  })

  it('알 수 없는 DOMException은 UNKNOWN으로 매핑해야 함', () => {
    expect(wrapError(new DOMException('x', 'WeirdError')).code).toBe('UNKNOWN')
  })

  it('이미 WebIdentityError면 그대로 반환해야 함', () => {
    const original = new WebIdentityError('NOT_SUPPORTED', 'nope')
    expect(wrapError(original)).toBe(original)
  })

  it('일반 Error는 UNKNOWN으로 감싸야 함', () => {
    const wrapped = wrapError(new Error('boom'))
    expect(wrapped).toBeInstanceOf(WebIdentityError)
    expect(wrapped.code).toBe('UNKNOWN')
    expect(wrapped.message).toBe('boom')
  })
})

describe('assertCredentialsAPI', () => {
  it('보안 컨텍스트가 아니면 SECURITY_ERROR를 던져야 함', () => {
    vi.stubGlobal('isSecureContext', false)
    vi.stubGlobal('navigator', { credentials: {} })

    expect(() => assertCredentialsAPI()).toThrow(/secure context/)
  })

  it('credentials API가 없으면 NOT_SUPPORTED를 던져야 함', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', {})

    expect(() => assertCredentialsAPI()).toThrow(/not supported/)
  })

  it('보안 컨텍스트에 credentials API가 있으면 통과해야 함', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { credentials: {} })

    expect(() => assertCredentialsAPI()).not.toThrow()
  })
})
