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

describe('WebIdentity.detectFeatures 실제 지원 여부', () => {
  it('클라이언트 기능이 확인되지 않으면 immediate·조건부 생성·FedCM active mode를 false로 반환해야 함', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('PublicKeyCredential', class {})
    vi.stubGlobal('IdentityCredential', class {})
    vi.stubGlobal('navigator', {
      credentials: { get: vi.fn().mockRejectedValue(new TypeError('x')) },
    })

    const support = await new WebIdentity('example.com').detectFeatures()

    expect(support.webauthn).toBe(true)
    expect(support.fedcm).toBe(true)
    expect(support.immediateMediation).toBe(false)
    expect(support.passkeyConditionalCreate).toBe(false)
    expect(support.fedcmActiveMode).toBe(false)
  })

  it('클라이언트 기능과 FedCM mode 옵션이 확인되면 true로 반환해야 함', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal(
      'PublicKeyCredential',
      Object.assign(class {}, {
        getClientCapabilities: vi
          .fn()
          .mockResolvedValue({ immediateGet: true, conditionalCreate: true }),
      }),
    )
    vi.stubGlobal('IdentityCredential', class {})
    vi.stubGlobal('navigator', {
      credentials: {
        get: vi.fn((options: { identity?: { mode?: unknown } }) => {
          void options.identity?.mode
          return Promise.reject(new TypeError('providers required'))
        }),
      },
    })

    const support = await new WebIdentity('example.com').detectFeatures()

    expect(support.immediateMediation).toBe(true)
    expect(support.passkeyConditionalCreate).toBe(true)
    expect(support.fedcmActiveMode).toBe(true)
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
