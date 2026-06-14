import { describe, it, expect, vi, afterEach } from 'vitest'
import { WebIdentity } from './web-identity'
import { CredentialManager } from './credential-manager'
import { Passkeys } from './passkeys'
import { FedCM } from './fedcm'
import { DigitalCredentials } from './digital-credentials'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WebIdentity 생성', () => {
  it('rpId와 하위 모듈들을 구성해야 함', () => {
    const identity = new WebIdentity('example.com')

    expect(identity.rpId).toBe('example.com')
    expect(identity.credentialManager).toBeInstanceOf(CredentialManager)
    expect(identity.passkeys).toBeInstanceOf(Passkeys)
    expect(identity.fedcm).toBeInstanceOf(FedCM)
    expect(identity.digitalCredentials).toBeInstanceOf(DigitalCredentials)
  })
})

describe('WebIdentity.detectFeatures', () => {
  it('모든 기능 플래그를 boolean으로 반환해야 함', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { credentials: { get: vi.fn() } })

    const support = await new WebIdentity('example.com').detectFeatures()

    const keys = [
      'credentialManager',
      'webauthn',
      'conditionalMediation',
      'immediateMediation',
      'passkeyConditionalCreate',
      'signalAPI',
      'fedcm',
      'fedcmActiveMode',
      'digitalCredentials',
    ] as const

    for (const key of keys) {
      expect(typeof support[key]).toBe('boolean')
    }
    expect(support.credentialManager).toBe(true)
  })
})

describe('WebIdentity.signIn', () => {
  it('자격증명이 없으면 null을 반환해야 함', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', {
      credentials: { get: vi.fn().mockResolvedValue(null) },
    })

    const result = await new WebIdentity('example.com').signIn({
      password: true,
      mediation: 'immediate',
    })

    expect(result).toBeNull()
  })
})
