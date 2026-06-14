import { toBase64URL, fromBase64URL } from '../utils'

/**
 * 패스키(WebAuthn) 서버 측 검증 로직 예제.
 *
 * 프레임워크에 의존하지 않는 순수 모듈로, 전역 `crypto.subtle`만 사용하므로
 * Node(서버)와 브라우저 양쪽에서 그대로 동작한다. 실제 서비스에서는
 * `challenges`/`credentials`를 DB/세션 스토어로 교체하면 된다.
 *
 * 핵심: 비밀번호와 달리 서버는 **공개키만** 저장하고, 로그인 시 클라이언트가
 * 보낸 서명을 공개키로 검증한다. 공개키가 유출돼도 위조 로그인은 불가능하다.
 */
export interface StoredCredential {
  credentialId: string
  publicKey: CryptoKey
  algorithm: number
}

export interface SerializedRegistration {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject: string
    publicKey?: string
    publicKeyAlgorithm?: number
    transports?: string[]
  }
}

export interface SerializedAssertion {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle: string | null
  }
}

interface ClientData {
  type: string
  challenge: string
  origin: string
}

export class PasskeyServer {
  private readonly challenges = new Map<string, Uint8Array>()
  private readonly credentials = new Map<string, StoredCredential>()

  constructor(
    private readonly rpId: string,
    private readonly origin: string,
  ) {}

  /** 등록 챌린지를 발급하고 세션에 저장한다. */
  startRegistration(sessionId: string): Uint8Array {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    this.challenges.set(sessionId, challenge)
    return challenge
  }

  /** 클라이언트가 보낸 등록 응답을 검증하고 공개키를 저장한다. */
  async finishRegistration(
    sessionId: string,
    registration: SerializedRegistration,
  ): Promise<StoredCredential> {
    const clientData = this.decodeClientData(
      registration.response.clientDataJSON,
    )
    this.assertClientData(clientData, 'webauthn.create', sessionId)

    if (!registration.response.publicKey) {
      throw new Error(
        'No public key in attestation (getPublicKey unsupported).',
      )
    }

    const publicKey = await crypto.subtle.importKey(
      'spki',
      fromBase64URL(registration.response.publicKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )

    const stored: StoredCredential = {
      credentialId: registration.id,
      publicKey,
      algorithm: registration.response.publicKeyAlgorithm ?? -7,
    }
    this.credentials.set(registration.id, stored)
    this.challenges.delete(sessionId)
    return stored
  }

  /** 인증 챌린지를 발급하고 세션에 저장한다. */
  startAuthentication(sessionId: string): Uint8Array {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    this.challenges.set(sessionId, challenge)
    return challenge
  }

  /**
   * 클라이언트가 보낸 인증 응답(assertion)의 서명을 저장된 공개키로 검증한다.
   * @returns 서명이 유효하면 true
   */
  async finishAuthentication(
    sessionId: string,
    assertion: SerializedAssertion,
  ): Promise<boolean> {
    const stored = this.credentials.get(assertion.id)
    if (!stored) {
      throw new Error(`Unknown credential: ${assertion.id}`)
    }

    const clientData = this.decodeClientData(assertion.response.clientDataJSON)
    this.assertClientData(clientData, 'webauthn.get', sessionId)

    const authenticatorData = fromBase64URL(
      assertion.response.authenticatorData,
    )

    const expectedRpIdHash = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(this.rpId),
      ),
    )
    if (!bytesEqual(authenticatorData.subarray(0, 32), expectedRpIdHash)) {
      throw new Error('rpId hash mismatch.')
    }

    // authenticatorData[32] flags: bit 0 = User Present
    if ((authenticatorData[32]! & 0x01) === 0) {
      throw new Error('User Present flag not set.')
    }

    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        fromBase64URL(assertion.response.clientDataJSON),
      ),
    )
    const signedData = concat(authenticatorData, clientDataHash)
    const rawSignature = derToRawEcdsaSignature(
      fromBase64URL(assertion.response.signature),
    )

    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      stored.publicKey,
      rawSignature,
      signedData,
    )

    this.challenges.delete(sessionId)
    return verified
  }

  hasCredential(credentialId: string): boolean {
    return this.credentials.has(credentialId)
  }

  private decodeClientData(clientDataJSON: string): ClientData {
    return JSON.parse(
      new TextDecoder().decode(fromBase64URL(clientDataJSON)),
    ) as ClientData
  }

  private assertClientData(
    clientData: ClientData,
    expectedType: string,
    sessionId: string,
  ): void {
    if (clientData.type !== expectedType) {
      throw new Error(`Unexpected clientData type: ${clientData.type}`)
    }
    if (clientData.origin !== this.origin) {
      throw new Error(`Origin mismatch: ${clientData.origin}`)
    }
    const expected = this.challenges.get(sessionId)
    if (!expected) {
      throw new Error('No pending challenge for this session.')
    }
    if (clientData.challenge !== toBase64URL(expected)) {
      throw new Error('Challenge mismatch.')
    }
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

/**
 * WebAuthn ECDSA 서명은 ASN.1 DER 인코딩이지만 WebCrypto `verify`는
 * raw r||s(IEEE P1363) 형식을 요구하므로 변환한다.
 */
function derToRawEcdsaSignature(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) throw new Error('Invalid DER signature.')

  let index = der[1]! & 0x80 ? 2 + (der[1]! & 0x7f) : 2

  if (der[index] !== 0x02) throw new Error('Invalid DER signature (r).')
  const rLength = der[index + 1]!
  const r = der.subarray(index + 2, index + 2 + rLength)
  index = index + 2 + rLength

  if (der[index] !== 0x02) throw new Error('Invalid DER signature (s).')
  const sLength = der[index + 1]!
  const s = der.subarray(index + 2, index + 2 + sLength)

  const out = new Uint8Array(64)
  out.set(toFixed32(r), 0)
  out.set(toFixed32(s), 32)
  return out
}

function toFixed32(integer: Uint8Array): Uint8Array {
  let start = 0
  while (start < integer.length - 1 && integer[start] === 0) start++
  const trimmed = integer.subarray(start)
  if (trimmed.length > 32)
    throw new Error('ECDSA integer longer than 32 bytes.')
  const out = new Uint8Array(32)
  out.set(trimmed, 32 - trimmed.length)
  return out
}
