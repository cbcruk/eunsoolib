# @cbcruk/save-image

URL에서 이미지를 내려받아 매직 넘버로 형식을 판별한 뒤 알맞은 확장자로 저장하는 Node
유틸리티입니다.

내부는 Effect(`@effect/platform`의 `HttpClient`, `FileSystem`)로 구성되어 있습니다. 일반
`Promise`로 쓰는 `downloadImage`와, 다른 Effect와 조합할 수 있는 `downloadImageEffect`를 함께
제공합니다.

## 설치

```bash
pnpm add @cbcruk/save-image
```

`effect`, `@effect/platform`, `@effect/platform-node`, `@cbcruk/get-file-type-from-buffer`는
의존성으로 함께 설치되므로 따로 추가할 필요가 없습니다. `Buffer`와 Node 파일 시스템을 쓰므로
**Node 전용**입니다.

## 사용법

```ts
import { downloadImage, DownloadImageError } from '@cbcruk/save-image'

try {
  const filePath = await downloadImage({
    url: 'https://avatars.githubusercontent.com/u/7017895?v=4',
    dest: './assets',
    filename: 'avatar',
  })
  console.log(filePath) // ./assets/avatar.jpg
} catch (error) {
  if (error instanceof DownloadImageError) {
    console.error(error.message, error.cause)
  }
}
```

`dest` 디렉터리가 없으면 재귀적으로 만든 뒤 `<dest>/<filename>.<ext>`로 저장합니다.

### Effect로 조합하기

`downloadImageEffect`는 실행하지 않은 Effect를 돌려주므로 `FileSystem`과 `HttpClient`를 직접
제공합니다. 테스트에서는 `FetchHttpClient.Fetch`에 가짜 `fetch`를 넣어 네트워크 없이 실행할 수
있습니다.

```ts
import { Effect } from 'effect'
import { FetchHttpClient } from '@effect/platform'
import { NodeContext } from '@effect/platform-node'
import { downloadImageEffect } from '@cbcruk/save-image'

const program = downloadImageEffect({ url, dest: './assets' }).pipe(
  Effect.retry({ times: 2 }),
  Effect.catchTag('DownloadImageError', (error) =>
    Effect.logError(error.message).pipe(Effect.as(null)),
  ),
)

const filePath = await program.pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise,
)
```

## API

### `downloadImage({ url, dest, filename? })`

`Promise<string>`을 반환합니다. 저장한 파일 경로로 resolve하고, 어느 단계에서든 실패하면
`DownloadImageError`로 reject합니다. Node 파일 시스템과 전역 `fetch` 기반 HTTP 클라이언트를
제공해 `downloadImageEffect`를 실행합니다.

| 옵션       | 타입     | 기본값    | 설명                                              |
| ---------- | -------- | --------- | ------------------------------------------------- |
| `url`      | `string` | —         | 내려받을 이미지 URL                               |
| `dest`     | `string` | —         | 저장할 **디렉터리**                               |
| `filename` | `string` | `'image'` | 확장자를 뺀 파일명. 확장자는 응답 바이트로 판별함 |

동작 순서:

1. `url`을 GET 요청하고, 2xx가 아니면 실패
2. 본문을 `Buffer`로 읽음
3. `getFileTypeFromBuffer`로 확장자 판별
4. `dest` 디렉터리 생성 (`recursive: true`)
5. `<dest>/<filename>.<ext>`에 기록하고 그 경로를 반환

실패한 요청이나 판별할 수 없는 응답은 디렉터리를 만들거나 파일을 쓰지 않습니다.

### `downloadImageEffect({ url, dest, filename? })`

`Effect<string, DownloadImageError, FileSystem | HttpClient>`를 반환합니다. 인자와 동작 순서는
`downloadImage`와 같고, 실행과 서비스 제공은 호출하는 쪽이 맡습니다.

### `DownloadImageError`

`Data.TaggedError('DownloadImageError')` 기반 에러 클래스(`message`, `cause?`)입니다. 요청 실패,
2xx가 아닌 HTTP 상태, 본문 읽기 실패, 형식 판별 실패, 파일 저장 실패를 모두 이 에러로 표현하며
원래 에러(`HttpClientError`, `FileTypeFromBufferError`, `PlatformError`)는 `cause`에 담깁니다.

## 제약

- 같은 `dest`에 같은 `filename`으로 다시 받으면 기존 파일을 덮어씁니다.
- 이미지 여부를 따로 확인하지 않습니다. 매직 넘버로 판별 가능한 형식이면 이미지가 아니어도(예:
  PDF) 그대로 저장합니다.
- `filename`에 경로 구분자가 들어가면 `dest` 아래 하위 경로로 해석됩니다. 검증하지 않으므로
  신뢰할 수 없는 입력을 그대로 넘기지 마세요.

## 호환성

`0.0.1`에서는 성공·실패와 무관하게 콘솔에 로그만 남기고 `Promise<void>`로 resolve했습니다. 이제는
저장 경로로 resolve하고 실패하면 reject하므로, 기존 호출부에서 실패가 처리되지 않은 rejection이
되지 않도록 `catch`를 추가하세요. 콘솔 로그는 더 이상 출력하지 않습니다.
