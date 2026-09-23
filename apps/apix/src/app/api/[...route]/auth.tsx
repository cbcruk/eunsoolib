/** @jsxImportSource hono/jsx */
import { BasicAuthStrategy } from '@cbcruk/authorization'
import { Hono } from 'hono'
import { basicAuthEnv } from '@/lib/env'

export const auth = new Hono()

const credentials = basicAuthEnv()

// 자격 증명이 없으면 인증을 붙이지 않는다. 예전에는 빈 문자열을 username/password로
// 넘겨서 `Basic Og==` 하나면 통과하는 상태였다.
if (!credentials) {
  auth.all('/*', (c) => {
    return c.json({ error: 'basic auth is not configured' }, 503)
  })
} else {
  const strategy = new BasicAuthStrategy(
    credentials.APIX_AUTH_USERNAME,
    credentials.APIX_AUTH_PASSWORD,
  )

  auth.use('/*', async (c, next) => {
    // 전략은 표준 Request를 받고 실패하면 그대로 반환할 401 Response를 돌려준다.
    const result = strategy.authorize(c.req.raw)

    if (result instanceof Response) {
      return result
    }

    await next()
  })

  auth.get('/page', (c) => {
    return c.html(<p>Authorized</p>)
  })
}
