# @cbcruk/apix

Hono 라우터를 Next.js App Router 위에 올린 개인용 API 모음. Vercel에 배포한다.

배포된 모든 라우트는 `/api/*` 아래에 있고, `src/app/api/[...route]/route.ts` 하나가
Hono 앱을 `GET`/`POST` 핸들러로 내보낸다.

## 개발

```bash
pnpm --filter @cbcruk/apix dev
open http://localhost:3000
```

## 라우트

| 경로                                | 하는 일                                                   | 필요 환경변수 |
| ----------------------------------- | --------------------------------------------------------- | ------------- |
| `GET /api/now`                      | 현재 시각을 UTC와 `Asia/Seoul` 기준으로 함께 출력         | —             |
| `GET /api/when?date=`               | 주어진 날짜를 두 타임존으로 변환                          | —             |
| `GET /api/emoji`                    | 인라인 SVG 이모지                                         | —             |
| `GET /api/smc?input=`               | 상태 머신 텍스트를 SVG 다이어그램으로 렌더 (생략 시 예시) | —             |
| `GET /api/i18n?name=&lang=&format=` | 구글 시트의 번역을 JSON 또는 PO로 변환                    | `SHEET_ID`    |
| `GET /api/spotify/playing`          | 최근 재생한 곡을 HTML 카드로 (없으면 404, 실패는 502)     | Spotify 5종   |
| `GET /api/spotify/auth`             | refresh token 발급 플로우 (최초 1회)                      | Spotify 5종   |
| `GET /api/auth/page`                | Basic 인증 데모                                           | `APIX_AUTH_*` |

## 환경변수

값은 Vercel 프로젝트 설정에만 두고 저장소에는 넣지 않는다. 로컬에서는
`apps/apix/.env.local`을 쓴다(gitignore 대상).

| 이름                     | 쓰는 곳        | 설명                                      |
| ------------------------ | -------------- | ----------------------------------------- |
| `SHEET_ID`               | `/api/i18n`    | 번역 시트를 내보내는 Apps Script 배포 ID  |
| `SPOTIFY_CLIENT_ID`      | `/api/spotify` | Spotify 앱 클라이언트 ID                  |
| `SPOTIFY_CLIENT_SECRET`  | `/api/spotify` | 클라이언트 시크릿                         |
| `SPOTIFY_REFRESH_TOKEN`  | `/api/spotify` | `/api/spotify/auth`로 한 번 발급받은 토큰 |
| `SPOTIFY_REDIRECT_URI`   | `/api/spotify` | Spotify 앱에 등록한 리다이렉트 URI        |
| `SPOTIFY_TOKEN_ENDPOINT` | `/api/spotify` | 토큰 엔드포인트 URL                       |
| `APIX_AUTH_USERNAME`     | `/api/auth`    | Basic 인증 사용자명                       |
| `APIX_AUTH_PASSWORD`     | `/api/auth`    | Basic 인증 비밀번호                       |

## 워크스페이스 패키지 사용

이 앱은 `packages/*`를 `workspace:*`로 당겨 쓰는 자리이기도 하다. 자기 라이브러리를
직접 쓰면 API의 어색한 부분이 드러난다 — `safeJson`은 이 앱을 옮기다 없다는 걸
발견해서 추가했다.

| 패키지                  | 쓰는 곳                     | 하는 일                                                   |
| ----------------------- | --------------------------- | --------------------------------------------------------- |
| `@cbcruk/fetch-outcome` | `/api/spotify`, `/api/i18n` | 외부 API 호출 실패를 이유와 재시도 판단이 담긴 결과로     |
| `@cbcruk/authorization` | `/api/auth`                 | 표준 `Request` 기반 Basic 인증 (상수 시간 비교, RFC 7617) |

외부 호출이 실패하면 `502`와 함께 무엇이 잘못됐는지 돌려준다.

```
GET /api/spotify/playing   (토큰 엔드포인트에 도달 불가)
502 {"error":"ERR_HTTP_DNS_RESOLUTION: no request was ever transmitted","retry":"safe"}

GET /api/i18n              (Apps Script가 JSON 대신 HTML 오류 페이지)
502 {"error":"response body is not valid JSON"}
```

## 환경변수 검증

검증은 `src/lib/env.ts`에서 **라우트 단위로** 한다. Spotify 자격 증명이 없다고
`/api/now`까지 죽지 않도록 한 앱 스키마로 묶지 않았다. 값이 없으면 어떤 변수가
없는지 말하고 실패한다.

`APIX_AUTH_*`를 설정하지 않으면 `/api/auth/*`는 `503`을 반환한다. 인증 미들웨어를
아예 붙이지 않으므로, 빈 자격 증명으로 통과되는 일은 없다.

## Spotify 연결

`docs/spotify.md`에 인증 흐름과 토큰 발급 과정을 정리해 뒀다.

## 배포

Vercel 프로젝트의 Root Directory를 `apps/apix`로 설정한다. 모노레포이므로 다른
폴더만 바뀐 커밋에서 빌드하지 않도록 Ignored Build Step을 걸어 두는 것이 좋다.

```bash
git diff --quiet HEAD^ HEAD -- :/apps/apix :/packages :/pnpm-lock.yaml
```

종료 코드가 `0`(변경 없음)이면 빌드를 건너뛴다.

경로 앞의 `:/`가 중요하다. 이 명령은 **Root Directory(`apps/apix`) 안에서**
실행되므로, `apps/apix` 같은 저장소 루트 기준 경로를 그대로 쓰면 아무것도
매칭되지 않아 항상 "변경 없음"이 되고 빌드가 영영 건너뛰어진다. `:/`는
pathspec을 저장소 루트 기준으로 해석하게 한다.
