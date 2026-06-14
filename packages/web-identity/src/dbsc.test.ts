import { describe, it, expect, vi, afterEach } from 'vitest'
import { DBSC } from './dbsc'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DBSC.registrationHeaders', () => {
  it('등록 엔드포인트 헤더를 만들어야 함', () => {
    const headers = DBSC.registrationHeaders({
      registrationEndpoint: '/dbsc/register',
    })

    expect(headers['Sec-Session-Registration']).toBe('/dbsc/register')
  })

  it('refresh 엔드포인트가 있으면 헤더에 포함해야 함', () => {
    const headers = DBSC.registrationHeaders({
      registrationEndpoint: '/dbsc/register',
      refreshEndpoint: '/dbsc/refresh',
    })

    expect(headers['Sec-Session-Registration']).toBe(
      '/dbsc/register; refresh="/dbsc/refresh"',
    )
  })
})

describe('DBSC.wellKnownPath', () => {
  it('well-known 경로를 반환해야 함', () => {
    expect(DBSC.wellKnownPath()).toBe(
      '/.well-known/device-bound-session-credentials',
    )
  })
})

describe('DBSC.isSupported', () => {
  it('navigator.sessionCredential이 있으면 지원으로 판단해야 함', () => {
    vi.stubGlobal('navigator', { sessionCredential: {} })
    expect(DBSC.isSupported()).toBe(true)
  })

  it('없으면 미지원으로 판단해야 함', () => {
    vi.stubGlobal('navigator', {})
    expect(DBSC.isSupported()).toBe(false)
  })
})
