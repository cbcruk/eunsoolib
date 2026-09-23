/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import { basicAuthEnv } from '@/lib/env'

export const auth = new Hono()

const credentials = basicAuthEnv()

if (credentials) {
  auth.use(
    '/*',
    basicAuth({
      username: credentials.APIX_AUTH_USERNAME,
      password: credentials.APIX_AUTH_PASSWORD,
    }),
  )

  auth.get('/page', (c) => {
    return c.html(<p>Authorized</p>)
  })
} else {
  // 자격 증명이 없으면 인증 미들웨어를 붙이지 않는다. 예전에는 빈 문자열을
  // username/password로 넘겨서 `Basic Og==` 하나면 통과하는 상태였다.
  auth.all('/*', (c) => {
    return c.json({ error: 'basic auth is not configured' }, 503)
  })
}
