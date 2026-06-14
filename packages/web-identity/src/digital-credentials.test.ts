import { describe, it, expect, vi, afterEach } from 'vitest'
import { DigitalCredentials } from './digital-credentials'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DigitalCredentials.mdocProvider', () => {
  it('mdoc 프로바이더 요청을 만들어야 함', () => {
    const provider = DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
      DigitalCredentials.Fields.ageOver18,
    ])

    expect(provider.protocol).toBe('openid4vp')
    expect(provider.request.selector.format).toBe('mdoc')
    expect(provider.request.selector.doctype).toBe('org.iso.18013.5.1.mDL')
    expect(provider.request.selector.fields).toEqual([
      { namespace: 'org.iso.18013.5.1', name: 'age_over_18' },
    ])
  })
})

describe('DigitalCredentials.Fields', () => {
  it('표준 mDL 필드 상수를 제공해야 함', () => {
    expect(DigitalCredentials.Fields.givenName).toEqual({
      namespace: 'org.iso.18013.5.1',
      name: 'given_name',
    })
    expect(DigitalCredentials.Fields.portrait.name).toBe('portrait')
  })
})

describe('DigitalCredentials.isSupported', () => {
  it('DigitalCredential이 window에 있으면 지원으로 판단해야 함', () => {
    vi.stubGlobal('DigitalCredential', class {})
    expect(DigitalCredentials.isSupported()).toBe(true)
  })
})

describe('DigitalCredentials.request', () => {
  it('자격증명을 반환해야 함', async () => {
    const credential = { type: 'digital' }
    const get = vi.fn().mockResolvedValue(credential)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('DigitalCredential', class {})
    vi.stubGlobal('navigator', { credentials: { get } })

    const result = await new DigitalCredentials().request([
      DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
        DigitalCredentials.Fields.ageOver18,
      ]),
    ])

    expect(result).toBe(credential)
  })

  it('사용자가 거부하면 null을 반환해야 함', async () => {
    const get = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('DigitalCredential', class {})
    vi.stubGlobal('navigator', { credentials: { get } })

    const result = await new DigitalCredentials().request([
      DigitalCredentials.mdocProvider('org.iso.18013.5.1.mDL', [
        DigitalCredentials.Fields.ageOver18,
      ]),
    ])

    expect(result).toBeNull()
  })
})
