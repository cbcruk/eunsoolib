import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Passkeys } from './passkeys'
import { WebIdentityError } from './types'

function mockCredentials(impl: {
  create?: ReturnType<typeof vi.fn>
  get?: ReturnType<typeof vi.fn>
}): void {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', {
    credentials: {
      create: impl.create ?? vi.fn(),
      get: impl.get ?? vi.fn(),
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Passkeys.generateChallenge', () => {
  it('지정한 길이의 무작위 바이트를 생성해야 함', () => {
    const challenge = Passkeys.generateChallenge(16)
    expect(challenge).toBeInstanceOf(Uint8Array)
    expect(challenge).toHaveLength(16)
  })

  it('기본 길이는 32여야 함', () => {
    expect(Passkeys.generateChallenge()).toHaveLength(32)
  })
})

describe('Passkeys.serialize', () => {
  it('등록 응답(attestation)을 직렬화해야 함', () => {
    const credential = {
      id: 'cred-id',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3]).buffer,
      response: {
        clientDataJSON: new Uint8Array([4, 5]).buffer,
        attestationObject: new Uint8Array([6, 7]).buffer,
        getTransports: () => ['internal'],
      },
      getClientExtensionResults: () => ({}),
    } as unknown as PublicKeyCredential

    const result = Passkeys.serialize(credential)

    expect(result.id).toBe('cred-id')
    expect(result.rawId).toBe('AQID')
    expect((result.response as Record<string, unknown>).attestationObject).toBe(
      'Bgc',
    )
    expect((result.response as Record<string, unknown>).transports).toEqual([
      'internal',
    ])
  })

  it('인증 응답(assertion)을 직렬화해야 함', () => {
    const credential = {
      id: 'cred-id',
      type: 'public-key',
      rawId: new Uint8Array([1]).buffer,
      response: {
        clientDataJSON: new Uint8Array([2]).buffer,
        authenticatorData: new Uint8Array([3]).buffer,
        signature: new Uint8Array([4]).buffer,
        userHandle: new Uint8Array([5]).buffer,
      },
    } as unknown as PublicKeyCredential

    const result = Passkeys.serialize(credential)
    const response = result.response as Record<string, unknown>

    expect(response.authenticatorData).toBe('Aw')
    expect(response.signature).toBe('BA')
    expect(response.userHandle).toBe('BQ')
  })
})

describe('Passkeys 기능 감지', () => {
  it('PublicKeyCredential이 있고 보안 컨텍스트면 지원으로 판단해야 함', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('PublicKeyCredential', class {})
    expect(Passkeys.isSupported()).toBe(true)
  })

  it('PublicKeyCredential이 없으면 미지원으로 판단해야 함', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('PublicKeyCredential', undefined)
    expect(Passkeys.isSupported()).toBe(false)
  })

  it('Signal API 정적 메서드가 있으면 지원으로 판단해야 함', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal(
      'PublicKeyCredential',
      class {
        static signalUnknownCredential(): void {}
      },
    )
    expect(Passkeys.isSignalAPISupported()).toBe(true)
  })
})

describe('Passkeys.create', () => {
  it('자격증명을 생성해 반환해야 함', async () => {
    const fakeCredential = { id: 'new-passkey' }
    mockCredentials({ create: vi.fn().mockResolvedValue(fakeCredential) })

    const passkeys = new Passkeys('example.com')
    const result = await passkeys.create({
      rp: { id: 'example.com', name: 'Example' },
      user: {
        id: new Uint8Array([1]),
        name: 'alice',
        displayName: 'Alice',
      },
      challenge: new Uint8Array([9]),
    })

    expect(result).toBe(fakeCredential)
  })

  it('생성이 취소되면 NOT_ALLOWED를 던져야 함', async () => {
    mockCredentials({ create: vi.fn().mockResolvedValue(null) })

    const passkeys = new Passkeys('example.com')
    await expect(
      passkeys.create({
        rp: { id: 'example.com', name: 'Example' },
        user: { id: new Uint8Array([1]), name: 'a', displayName: 'A' },
        challenge: new Uint8Array([9]),
      }),
    ).rejects.toMatchObject({ code: 'NOT_ALLOWED' })
  })
})

describe('Passkeys.authenticate', () => {
  it('immediate 모드에서 자격증명이 없으면 null을 반환해야 함', async () => {
    mockCredentials({
      get: vi
        .fn()
        .mockRejectedValue(new DOMException('none', 'NotAllowedError')),
    })

    const passkeys = new Passkeys('example.com')
    const result = await passkeys.authenticate(
      { challenge: new Uint8Array([1]) },
      { mediation: 'immediate' },
    )

    expect(result).toBeNull()
  })

  it('immediate가 아닐 때 NOT_ALLOWED는 에러로 전파해야 함', async () => {
    mockCredentials({
      get: vi
        .fn()
        .mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
    })

    const passkeys = new Passkeys('example.com')
    await expect(
      passkeys.authenticate({ challenge: new Uint8Array([1]) }),
    ).rejects.toBeInstanceOf(WebIdentityError)
  })
})
