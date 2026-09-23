import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { MissingEnvError } from '@/lib/env'
import { auth } from './auth'
import { emoji } from './emoji'
import { smc } from './smc'
import { i18n } from './i18n'
import { now } from './now'
import { when } from './when'
import { spotify } from './spotify'

export const dynamic = 'force-dynamic'

const app = new Hono().basePath('/api')

app.route('/auth', auth)
app.route('/i18n', i18n)
app.route('/emoji', emoji)
app.route('/smc', smc)
app.route('/now', now)
app.route('/when', when)
app.route('/spotify', spotify)

// 설정이 빠진 것은 서버 버그가 아니라 배포 상태다. 어떤 변수가 없는지 밝히고
// 503으로 돌려준다. 변수 이름만 싣고 값은 싣지 않는다.
app.onError((error, c) => {
  if (error instanceof MissingEnvError) {
    return c.json({ error: error.message, missing: error.missing }, 503)
  }

  throw error
})

export const POST = handle(app)
export const GET = handle(app)
