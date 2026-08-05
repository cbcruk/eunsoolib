/** 인증에 성공했을 때의 결과 */
export interface AuthResult {
  ok: boolean
}

/**
 * 요청 인증 전략의 공통 인터페이스
 *
 * 구현체는 인증에 성공하면 {@link AuthResult}를, 실패하면 그대로 반환할 수 있는
 * `Response`(예: 401)를 돌려준다.
 */
export interface AuthStrategy {
  authorize(request: Request): AuthResult | Response
}

/**
 * HTTP Basic 인증 전략
 *
 * `Authorization: Basic <base64>` 헤더를 파싱해 생성자에 넘긴 자격 증명과
 * 비교한다.
 *
 * @example
 * ```ts
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
   * @param username - 기대하는 사용자명
   * @param password - 기대하는 비밀번호
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
  authorize(request: Request) {
    const authorization = request.headers.get('authorization')

    if (!authorization || !authorization.startsWith('Basic ')) {
      return this.unauthorized()
    }

    try {
      const [, encoded] = authorization.split(' ')
      const decoded = atob(encoded)
      const [username, password] = decoded.split(':')

      if (username === this.username && password === this.password) {
        return {
          ok: true,
        }
      }
    } catch {
      return this.unauthorized()
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
