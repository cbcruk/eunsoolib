import { describe, it, expect, vi, afterEach } from 'vitest'
import { FedCM } from './fedcm'
import { WebIdentityError } from './types'

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFedCM(get: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('IdentityCredential', class {})
  vi.stubGlobal('navigator', { credentials: { get } })
}

describe('FedCM.provider', () => {
  it('프로바이더 설정 객체를 만들어야 함', () => {
    const provider = FedCM.provider(
      'https://idp/.well-known/fedcm.json',
      'cid',
      {
        nonce: 'n1',
      },
    )

    expect(provider).toEqual({
      configURL: 'https://idp/.well-known/fedcm.json',
      clientId: 'cid',
      nonce: 'n1',
    })
  })
})

describe('FedCM.isSupported', () => {
  it('IdentityCredential이 있으면 지원으로 판단해야 함', () => {
    vi.stubGlobal('IdentityCredential', class {})
    expect(FedCM.isSupported()).toBe(true)
  })
})

describe('FedCM.signIn', () => {
  it('자격증명을 반환해야 함', async () => {
    const credential = { type: 'identity' }
    const get = vi.fn().mockResolvedValue(credential)
    mockFedCM(get)

    const result = await new FedCM().signIn({
      providers: [FedCM.provider('https://idp/config.json', 'cid')],
      mode: 'active',
    })

    expect(result).toBe(credential)
    expect(get).toHaveBeenCalledOnce()
  })

  it('사용자가 프롬프트를 닫으면 null을 반환해야 함', async () => {
    const get = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    mockFedCM(get)

    const result = await new FedCM().signIn({
      providers: [FedCM.provider('https://idp/config.json', 'cid')],
    })

    expect(result).toBeNull()
  })
})

describe('FedCM.signInMultiProvider', () => {
  it('프로바이더가 2개 미만이면 INVALID_STATE를 던져야 함', async () => {
    await expect(
      new FedCM().signInMultiProvider([
        FedCM.provider('https://idp/config.json', 'cid'),
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' })
  })
})

describe('FedCM.disconnect', () => {
  it('disconnect 미지원 시 NOT_SUPPORTED를 던져야 함', async () => {
    vi.stubGlobal('IdentityCredential', class {})

    await expect(
      new FedCM().disconnect('https://idp/config.json', 'cid', 'hint'),
    ).rejects.toBeInstanceOf(WebIdentityError)
  })
})
