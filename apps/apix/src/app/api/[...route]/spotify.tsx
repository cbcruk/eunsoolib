/** @jsxImportSource hono/jsx */
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

  const response = await fetch(env.SPOTIFY_TOKEN_ENDPOINT, {
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
  })

  const data = (await response.json()) as { refresh_token?: string }

  if (!data.refresh_token) {
    return c.json({ error: 'no refresh_token in the token response' }, 502)
  }

  // refresh token은 환경변수에 넣을 값이다. 화면에 한 번 보여 주고 끝낸다.
  return c.html(<pre>{data.refresh_token}</pre>)
})

spotify.get('/playing', async (c) => {
  const track = await getRecentlyPlayed()

  if (!track) {
    return c.html(`NULL`)
  }

  const html = getHtml(track)

  return c.html(html)
})
