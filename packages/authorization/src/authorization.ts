export interface AuthResult {
  ok: boolean
}

export interface AuthStrategy {
  authorize(request: Request): AuthResult | Response
}

export class BasicAuthStrategy implements AuthStrategy {
  constructor(private username: string, private password: string) {}

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

  private unauthorized() {
    return new Response('인증이 필요합니다.', {
      status: 401,
      headers: {
        'WWW-authenticate': 'Basic realm="Secure Area"',
      },
    })
  }
}
