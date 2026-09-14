import { describe, expect, test } from 'vitest'
import { BasicAuthStrategy } from './authorization'

/** 문자열을 UTF-8 바이트 기준 base64로 인코딩한다. */
function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  return btoa(String.fromCharCode(...bytes))
}

function makeRequest(authorization?: string): Request {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('Authorization', authorization)
  return new Request('https://example.com/', { headers })
}

function basic(credentials: string, scheme = 'Basic'): Request {
  return makeRequest(`${scheme} ${encodeUtf8Base64(credentials)}`)
}

describe('BasicAuthStrategy', () => {
  test('자격 증명이 일치하면 { ok: true }를 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')

    expect(strategy.authorize(basic('admin:secret'))).toEqual({ ok: true })
  })

  test('실패하면 WWW-Authenticate 헤더가 있는 401 응답을 반환해야 함', async () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')
    const result = strategy.authorize(basic('admin:wrong'))

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe(
      'Basic realm="Secure Area"',
    )
    expect(await response.text()).toBe('인증이 필요합니다.')
  })

  test('헤더가 없으면 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')

    expect(strategy.authorize(makeRequest())).toBeInstanceOf(Response)
  })

  test('사용자명이 다르면 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')

    expect(strategy.authorize(basic('root:secret'))).toBeInstanceOf(Response)
  })

  test('비밀번호에 ":"가 있으면 첫 번째 ":"에서만 나눠 인증해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'se:cr:et')

    expect(strategy.authorize(basic('admin:se:cr:et'))).toEqual({ ok: true })
    expect(strategy.authorize(basic('admin:se'))).toBeInstanceOf(Response)
  })

  test('":"가 없는 자격 증명은 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', '')

    expect(strategy.authorize(basic('admin'))).toBeInstanceOf(Response)
  })

  test('빈 비밀번호도 정확히 일치하면 인증해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', '')

    expect(strategy.authorize(basic('admin:'))).toEqual({ ok: true })
  })

  test.each(['basic', 'BASIC', 'bAsIc'])(
    '스킴 "%s"도 대소문자 구분 없이 인식해야 함',
    (scheme) => {
      const strategy = new BasicAuthStrategy('admin', 'secret')

      expect(strategy.authorize(basic('admin:secret', scheme))).toEqual({
        ok: true,
      })
    },
  )

  test('Basic이 아닌 스킴은 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')
    const token = encodeUtf8Base64('admin:secret')

    expect(strategy.authorize(makeRequest(`Bearer ${token}`))).toBeInstanceOf(
      Response,
    )
    expect(strategy.authorize(makeRequest(`Basicx ${token}`))).toBeInstanceOf(
      Response,
    )
  })

  test('non-ASCII(UTF-8) 자격 증명을 올바르게 디코딩해야 함', () => {
    const strategy = new BasicAuthStrategy('사용자', '비밀번호✓')

    expect(strategy.authorize(basic('사용자:비밀번호✓'))).toEqual({ ok: true })
  })

  test('잘못된 base64나 UTF-8이면 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')

    expect(strategy.authorize(makeRequest('Basic !!!'))).toBeInstanceOf(
      Response,
    )
    // 0xff 는 유효한 UTF-8 바이트가 아니다
    expect(
      strategy.authorize(makeRequest(`Basic ${btoa('admin:\xff')}`)),
    ).toBeInstanceOf(Response)
  })

  test('길이만 다른 비밀번호는 접두사가 같아도 401을 반환해야 함', () => {
    const strategy = new BasicAuthStrategy('admin', 'secret')

    expect(strategy.authorize(basic('admin:secret1'))).toBeInstanceOf(Response)
    expect(strategy.authorize(basic('admin:secre'))).toBeInstanceOf(Response)
  })
})
