import { Passkeys } from '../passkeys'
import type {
  SerializedAssertion,
  SerializedRegistration,
} from './passkey-server'

/**
 * 패스키 클라이언트 흐름 예제 — `web-identity` 패키지의 `Passkeys`를 사용한다.
 *
 * 서버가 발급한 챌린지를 받아 인증기로 패스키를 만들고/서명하고,
 * `Passkeys.serialize`로 서버 전송용 JSON으로 직렬화한다.
 */
export interface RegisterClientOptions {
  rpId: string
  rpName: string
  userId: BufferSource
  userName: string
  displayName: string
  challenge: BufferSource
}

/** 새 패스키를 등록하고 서버로 보낼 직렬화 결과를 반환한다. */
export async function registerPasskey(
  options: RegisterClientOptions,
): Promise<SerializedRegistration> {
  const passkeys = new Passkeys(options.rpId)

  const credential = await passkeys.create({
    rp: { id: options.rpId, name: options.rpName },
    user: {
      id: options.userId,
      name: options.userName,
      displayName: options.displayName,
    },
    challenge: options.challenge,
  })

  return Passkeys.serialize(credential) as unknown as SerializedRegistration
}

/** 패스키로 인증하고 서버로 보낼 직렬화 결과를 반환한다. */
export async function authenticatePasskey(options: {
  rpId: string
  challenge: BufferSource
}): Promise<SerializedAssertion | null> {
  const passkeys = new Passkeys(options.rpId)

  const credential = await passkeys.authenticate({
    challenge: options.challenge,
    rpId: options.rpId,
  })
  if (!credential) return null

  return Passkeys.serialize(credential) as unknown as SerializedAssertion
}
