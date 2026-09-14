/** 인증에 성공했을 때의 결과 */
export interface AuthResult {
  /** 인증 성공 여부. {@link BasicAuthStrategy}는 성공 시에만 `true`로 반환한다. */
  ok: boolean
}

/**
 * 요청 인증 전략의 공통 인터페이스
 *
 * 구현체는 인증에 성공하면 {@link AuthResult}를, 실패하면 그대로 반환할 수 있는
 * `Response`(예: 401)를 돌려준다.
 */
export interface AuthStrategy {
  /** 요청을 검증해 성공 결과 또는 그대로 반환할 실패 `Response`를 돌려준다. */
  authorize(request: Request): AuthResult | Response
}

const BASIC_SCHEME = /^basic[ \t]+([^ \t]+)[ \t]*$/i

/** base64 자격 증명을 UTF-8 문자열로 디코딩한다. 잘못된 base64나 UTF-8이면 던진다. */
function decodeCredentials(encoded: string): string {
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

/**
 * 두 문자열의 UTF-8 바이트를 내용과 무관한 시간에 비교한다.
 *
 * 첫 불일치에서 멈추지 않고 긴 쪽 길이만큼 모두 비교해, 응답 시간으로
 * 일치하는 접두사 길이를 추측할 수 없게 한다.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  const length = Math.max(left.length, right.length)
  let diff = left.length ^ right.length

  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }

  return diff === 0
}

/**
 * HTTP Basic 인증 전략
 *
 * `Authorization: Basic <base64>` 헤더를 파싱해 생성자에 넘긴 자격 증명과
 * 비교한다. 스킴 이름은 대소문자를 구분하지 않고, 자격 증명은 UTF-8로 디코딩한
 * 뒤 첫 번째 `:`에서 사용자명과 비밀번호로 나눈다(RFC 7617). 사용자명과
 * 비밀번호는 둘 다 상수 시간으로 비교한다.
 *
 * @example
 * ```ts
 * import { BasicAuthStrategy } from '@cbcruk/authorization'
 *
 * const strategy = new BasicAuthStrategy('admin', 'secret')
 * const result = strategy.authorize(request)
 *
 * if (result instanceof Response) {
 *   return result // 401 응답
 * }
 * ```
 */
export class BasicAuthStrategy implements AuthStrategy {
  /**
   * @param username - 기대하는 사용자명. RFC 7617에 따라 `:`를 포함할 수 없다
   * @param password - 기대하는 비밀번호. `:`와 non-ASCII 문자를 포함할 수 있다
   */
  constructor(
    private username: string,
    private password: string,
  ) {}

  /**
   * 요청의 Basic 인증 헤더를 검증
   *
   * @param request - 검증할 요청
   * @returns 자격 증명이 일치하면 `{ ok: true }`, 아니면 401 `Response`
   */
  authorize(request: Request): AuthResult | Response {
    const authorization = request.headers.get('authorization')
    const match = authorization?.match(BASIC_SCHEME)

    if (!match) {
      return this.unauthorized()
    }

    let decoded: string

    try {
      decoded = decodeCredentials(match[1])
    } catch {
      return this.unauthorized()
    }

    const separator = decoded.indexOf(':')

    if (separator === -1) {
      return this.unauthorized()
    }

    const usernameOk = timingSafeEqual(
      decoded.slice(0, separator),
      this.username,
    )
    const passwordOk = timingSafeEqual(
      decoded.slice(separator + 1),
      this.password,
    )

    if (usernameOk && passwordOk) {
      return { ok: true }
    }

    return this.unauthorized()
  }

  /** `WWW-Authenticate` 헤더를 포함한 401 응답을 생성 */
  private unauthorized() {
    return new Response('인증이 필요합니다.', {
      status: 401,
      headers: {
        'WWW-authenticate': 'Basic realm="Secure Area"',
      },
    })
  }
}
