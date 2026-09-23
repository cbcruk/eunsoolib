import { safeFetch, safeJson, type FetchOutcome } from '@cbcruk/fetch-outcome'
import { spotifyEnv } from '@/lib/env'
import type {
  AccessToken,
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

/**
 * 요청부터 JSON 파싱까지를 하나의 결과로 묶는다.
 *
 * 상태 코드가 2xx가 아니면 `indeterminate`로 돌려준다. fetch는 4xx·5xx를 실패로
 * 보지 않으므로(그건 성공적으로 받은 응답이다) 이 판단은 호출자 몫이다.
 */
async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<FetchOutcome<T>> {
  const method = init?.method ?? 'GET'
  const response = await safeFetch(input, init, { redactCrossOrigin: false })

  if (response.kind !== 'ok') {
    return response
  }

  if (!response.value.ok) {
    return {
      kind: 'indeterminate',
      retry: 'unknown',
      reason: `Spotify가 ${response.value.status}로 응답했습니다`,
      raw: response.value,
    }
  }

  return safeJson<T>(response.value, { method })
}

export async function getAccessToken(): Promise<FetchOutcome<AccessToken>> {
  const env = spotifyEnv()

  return request<AccessToken>(env.SPOTIFY_TOKEN_ENDPOINT, {
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
}

/** 액세스 토큰을 받아 Spotify Web API의 한 엔드포인트를 호출한다. */
async function withToken<T>(url: string): Promise<FetchOutcome<T>> {
  const token = await getAccessToken()

  if (token.kind !== 'ok') {
    return token
  }

  return request<T>(url, {
    headers: {
      Authorization: `Bearer ${token.value.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}

export async function getCurrentTrack(): Promise<FetchOutcome<Track | null>> {
  const state = await withToken<PlaybackState>(
    'https://api.spotify.com/v1/me/player/currently-playing',
  )

  if (state.kind !== 'ok') {
    return state
  }

  return { kind: 'ok', value: (state.value.item as TrackItem as Track) ?? null }
}

export async function getRecentlyPlayed(): Promise<FetchOutcome<Track | null>> {
  const page = await withToken<RecentlyPlayedTracksPage>(
    'https://api.spotify.com/v1/me/player/recently-played',
  )

  if (page.kind !== 'ok') {
    return page
  }

  return { kind: 'ok', value: page.value.items[0]?.track ?? null }
}
