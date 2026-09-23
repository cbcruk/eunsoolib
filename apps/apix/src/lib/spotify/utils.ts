import { spotifyEnv } from '@/lib/env'
import {
  AccessToken,
  Album,
  PlaybackState,
  RecentlyPlayedTracksPage,
  Track,
  TrackItem,
} from '@spotify/web-api-ts-sdk'

/** 토큰 엔드포인트에 쓰는 `client_id:client_secret`의 base64 인코딩. */
export function getBasicCredentials() {
  const env = spotifyEnv()

  return Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString('base64')
}

export async function getAccessToken() {
  const env = spotifyEnv()
  const response = await fetch(env.SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  })
  const data = (await response.json()) as AccessToken

  return data
}

export async function getCurrentTrack() {
  const token = await getAccessToken()
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  if (response.status !== 200) {
    return null
  }

  const data = (await response.json()) as PlaybackState
  const item = data.item as TrackItem as Track

  return item
}

export async function getRecentlyPlayed() {
  const token = await getAccessToken()
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/recently-played',
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  if (response.status !== 200) {
    return null
  }

  const data = (await response.json()) as RecentlyPlayedTracksPage
  const item = data.items[0]?.track

  return item ?? null
}
