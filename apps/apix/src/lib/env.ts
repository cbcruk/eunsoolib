import { z } from 'zod'

/** 환경변수가 빠져 라우트를 실행할 수 없을 때 던진다. */
export class MissingEnvError extends Error {
  readonly missing: string[]

  constructor(scope: string, missing: string[]) {
    super(`${scope}에 필요한 환경변수가 없습니다: ${missing.join(', ')}`)
    this.name = 'MissingEnvError'
    this.missing = missing
  }
}

/**
 * 라우트마다 필요한 환경변수만 따로 검증한다.
 *
 * 앱 전체를 한 스키마로 묶으면 Spotify 자격 증명이 없다는 이유로 `/api/now`까지
 * 죽는다. 값이 빠졌을 때는 조용히 빈 문자열로 외부 요청을 보내는 대신 어떤 변수가
 * 없는지 말하고 실패한다.
 */
function read<T extends z.ZodRawShape>(schema: z.ZodObject<T>, scope: string) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    throw new MissingEnvError(
      scope,
      parsed.error.issues.map((issue) => issue.path.join('.')),
    )
  }

  return parsed.data
}

const spotifySchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REFRESH_TOKEN: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
  SPOTIFY_TOKEN_ENDPOINT: z.string().url(),
})

const i18nSchema = z.object({
  SHEET_ID: z.string().min(1),
})

const basicAuthSchema = z.object({
  APIX_AUTH_USERNAME: z.string().min(1),
  APIX_AUTH_PASSWORD: z.string().min(1),
})

export const spotifyEnv = () => read(spotifySchema, 'Spotify 라우트')

export const i18nEnv = () => read(i18nSchema, 'i18n 라우트')

/** Basic 인증 자격 증명. 설정되지 않았으면 `null` — 라우트를 붙이지 않는다. */
export function basicAuthEnv(): z.infer<typeof basicAuthSchema> | null {
  const parsed = basicAuthSchema.safeParse(process.env)

  return parsed.success ? parsed.data : null
}
