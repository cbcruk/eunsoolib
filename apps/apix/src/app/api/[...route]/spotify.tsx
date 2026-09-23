/** @jsxImportSource hono/jsx */
import { safeFetch, safeJson } from '@cbcruk/fetch-outcome'
import { spotifyEnv } from '@/lib/env'
import { getHtml } from '@/lib/spotify/html'
import { getBasicCredentials, getRecentlyPlayed } from '@/lib/spotify/utils'
import { Hono } from 'hono'

export const spotify = new Hono()

spotify.get('/auth', async (c) => {
  const env = spotifyEnv()
  const code = c.req.query('code')

  if (!code) {
    const query = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      scope:
        'user-read-currently-playing user-read-recently-played user-top-read',
    })

    return c.redirect(
      `https://accounts.spotify.com/authorize?${query.toString()}`,
    )
  }

  const response = await safeFetch(
    env.SPOTIFY_TOKEN_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${getBasicCredentials()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI,
      }),
    },
    { redactCrossOrigin: false },
  )

  if (response.kind !== 'ok') {
    return c.json({ error: response.reason, retry: response.retry }, 502)
  }

  const body = await safeJson<{ refresh_token?: string }>(response.value, {
    method: 'POST',
  })

  if (body.kind !== 'ok') {
    return c.json({ error: body.reason }, 502)
  }

  if (!body.value.refresh_token) {
    return c.json({ error: 'no refresh_token in the token response' }, 502)
  }

  // refresh token은 환경변수에 넣을 값이다. 화면에 한 번 보여 주고 끝낸다.
  return c.html(<pre>{body.value.refresh_token}</pre>)
})

spotify.get('/playing', async (c) => {
  const track = await getRecentlyPlayed()

  if (track.kind !== 'ok') {
    // 예전에는 실패도 성공도 모두 "NULL" 한 줄이었다. 이유와 재시도 판단을 싣는다.
    return c.json({ error: track.reason, retry: track.retry }, 502)
  }

  if (!track.value) {
    return c.json({ error: 'no recently played track' }, 404)
  }

  return c.html(getHtml(track.value))
})
