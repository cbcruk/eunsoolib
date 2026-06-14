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
