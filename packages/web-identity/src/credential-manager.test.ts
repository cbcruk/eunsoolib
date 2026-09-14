import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CredentialManager } from './credential-manager'

class FakePassword {}
class FakePublicKey {}

function mockGet(get: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PasswordCredential', FakePassword)
  vi.stubGlobal('PublicKeyCredential', FakePublicKey)
  vi.stubGlobal('navigator', { credentials: { get } })
}

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CredentialManager.get', () => {
  it('자격증명이 없으면 null을 반환해야 함', async () => {
    mockGet(vi.fn().mockResolvedValue(null))
    const result = await new CredentialManager().get({ password: true })
    expect(result).toBeNull()
  })

  it('PasswordCredential을 password 타입으로 분류해야 함', async () => {
    const credential = new FakePassword()
    mockGet(vi.fn().mockResolvedValue(credential))

    const result = await new CredentialManager().get({ password: true })

    expect(result).toEqual({ type: 'password', credential })
  })

  it('identity 타입을 federated로 분류해야 함', async () => {
    const credential = { type: 'identity' }
    mockGet(vi.fn().mockResolvedValue(credential))

    const result = await new CredentialManager().get({
      identity: { providers: [] },
    })

    expect(result).toEqual({ type: 'federated', credential })
  })

  it('immediate 모드에서 NOT_ALLOWED는 null을 반환해야 함', async () => {
    mockGet(
      vi.fn().mockRejectedValue(new DOMException('none', 'NotAllowedError')),
    )

    const result = await new CredentialManager().get({
      password: true,
      mediation: 'immediate',
    })

    expect(result).toBeNull()
  })
})

describe('CredentialManager.isMediationSupported', () => {
  it('기본 mediation은 credentials.get이 있으면 지원으로 판단해야 함', () => {
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })
    expect(CredentialManager.isMediationSupported('optional')).toBe(true)
    expect(CredentialManager.isMediationSupported('silent')).toBe(true)
    expect(CredentialManager.isMediationSupported('required')).toBe(true)
  })

  it('immediate·conditional은 동기로 확인할 수 없으므로 false를 반환해야 함', () => {
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })
    expect(CredentialManager.isMediationSupported('immediate')).toBe(false)
    expect(CredentialManager.isMediationSupported('conditional')).toBe(false)
  })
})

describe('CredentialManager.isMediationAvailable', () => {
  it('immediate는 immediateGet 클라이언트 기능으로 판단해야 함', async () => {
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })
    vi.stubGlobal(
      'PublicKeyCredential',
      Object.assign(class {}, {
        getClientCapabilities: vi
          .fn()
          .mockResolvedValue({ immediateGet: true }),
      }),
    )
    await expect(
      CredentialManager.isMediationAvailable('immediate'),
    ).resolves.toBe(true)
  })

  it('immediateGet이 없으면 immediate를 미지원으로 판단해야 함', async () => {
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })
    vi.stubGlobal('PublicKeyCredential', class {})
    await expect(
      CredentialManager.isMediationAvailable('immediate'),
    ).resolves.toBe(false)
  })

  it('conditional은 isConditionalMediationAvailable 결과로 판단해야 함', async () => {
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })
    vi.stubGlobal(
      'PublicKeyCredential',
      Object.assign(class {}, {
        isConditionalMediationAvailable: vi.fn().mockResolvedValue(false),
      }),
    )
    await expect(
      CredentialManager.isMediationAvailable('conditional'),
    ).resolves.toBe(false)
  })
})
