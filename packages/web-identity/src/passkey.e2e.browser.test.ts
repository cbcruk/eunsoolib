import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { cdp } from 'vitest/browser'
import { PasskeyServer } from './examples/passkey-server'
import { registerPasskey, authenticatePasskey } from './examples/passkey-client'

/**
 * 패스키 전체 왕복 e2e — Playwright의 가상 인증기(CDP `WebAuthn`)로
 * 실제 인증기 없이 등록/인증을 수행하고, 서버 측에서 실제 ECDSA 서명을
 * WebCrypto로 검증한다.
 */
const rpId = location.hostname
const origin = location.origin
const sessionId = 'session-1'

const server = new PasskeyServer(rpId, origin)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let session: any
let authenticatorId: string
let registrationId: string

beforeAll(async () => {
  session = cdp()
  await session.send('WebAuthn.enable')
  const result = await session.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
  authenticatorId = result.authenticatorId

  // 서버가 등록 챌린지를 발급 → 클라이언트가 패스키 생성 → 서버가 검증·저장
  const challenge = server.startRegistration(sessionId)
  const registration = await registerPasskey({
    rpId,
    rpName: 'Example',
    userId: new TextEncoder().encode('user-1'),
    userName: 'alice@example.com',
    displayName: 'Alice',
    challenge,
  })
  registrationId = registration.id
  await server.finishRegistration(sessionId, registration)
})

afterAll(async () => {
  if (authenticatorId) {
    await session.send('WebAuthn.removeVirtualAuthenticator', {
      authenticatorId,
    })
  }
})

describe('패스키 등록 → 인증 e2e', () => {
  it('서버가 등록 시 공개키만 저장해야 함', () => {
    expect(server.hasCredential(registrationId)).toBe(true)
  })

  it('서버가 인증 서명을 공개키로 검증해 통과시켜야 함', async () => {
    const challenge = server.startAuthentication(sessionId)
    const assertion = await authenticatePasskey({ rpId, challenge })

    expect(assertion).not.toBeNull()
    const verified = await server.finishAuthentication(sessionId, assertion!)
    expect(verified).toBe(true)
  })

  it('이전 챌린지로 서명된 응답은 재사용(replay) 시 거부해야 함', async () => {
    const challenge = server.startAuthentication(sessionId)
    const assertion = await authenticatePasskey({ rpId, challenge })

    // 서버가 새 챌린지를 발급해 이전 챌린지를 무효화
    server.startAuthentication(sessionId)

    await expect(
      server.finishAuthentication(sessionId, assertion!),
    ).rejects.toThrow(/Challenge mismatch/)
  })

  it('등록되지 않은 자격증명은 거부해야 함', async () => {
    server.startAuthentication(sessionId)
    const assertion = {
      id: 'unknown-credential',
      rawId: 'unknown-credential',
      type: 'public-key',
      response: {
        clientDataJSON: '',
        authenticatorData: '',
        signature: '',
        userHandle: null,
      },
    }

    await expect(
      server.finishAuthentication(sessionId, assertion),
    ).rejects.toThrow(/Unknown credential/)
  })
})
