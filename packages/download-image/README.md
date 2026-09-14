# @cbcruk/download-image

URL에서 이미지를 내려받아 매직 넘버로 형식을 판별한 뒤 알맞은 확장자로 저장하는 Node
유틸리티입니다.

내부는 Effect(`@effect/platform`의 `HttpClient`, `FileSystem`)로 구성되어 있지만, 함수가
Effect를 직접 실행하므로 호출하는 쪽은 일반 `Promise`로 다룹니다.

## 설치

```bash
pnpm add @cbcruk/download-image
```

`effect`, `@effect/platform`, `@effect/platform-node`, `@cbcruk/get-file-type-from-buffer`는
의존성으로 함께 설치되므로 따로 추가할 필요가 없습니다. `Buffer`와 Node 파일 시스템을 쓰므로
**Node 전용**입니다.

## 사용법

```ts
import { downloadImage } from '@cbcruk/download-image'

await downloadImage({
  url: 'https://avatars.githubusercontent.com/u/7017895?v=4',
  dest: './assets',
})
// 콘솔: ✅ 저장됨 - ./assets/image.jpg
```

`dest` 디렉터리가 없으면 재귀적으로 만든 뒤 `<dest>/image.<ext>`로 저장합니다.

## API

### `downloadImage({ url, dest })`

`Promise<void>`를 반환합니다.

| 옵션   | 타입     | 기본값 | 설명                                         |
| ------ | -------- | ------ | -------------------------------------------- |
| `url`  | `string` | —      | 내려받을 이미지 URL                          |
| `dest` | `string` | —      | 저장할 **디렉터리** (파일명은 `image.<ext>`) |

동작 순서:

1. `dest` 디렉터리 생성 (`recursive: true`)
2. `url`을 GET 요청해 본문을 `Buffer`로 읽음
3. `getFileTypeFromBuffer`로 확장자 판별
4. `<dest>/image.<ext>`에 기록

### `DownloadImageError`

`Data.TaggedError('DownloadImageError')` 기반 에러 클래스(`message`, `cause?`)입니다. 현재
`downloadImage` 내부에서는 사용되지 않습니다.

## 제약

- 성공/실패 결과를 반환하지 않습니다. 성공하면 `console.log`로 저장 경로를, 실패하면
  `console.error`로 메시지를 출력하고 `Promise`는 그대로 resolve됩니다. 저장 경로가 필요하거나
  실패를 `catch`로 받아야 한다면 이 함수 대신 `@cbcruk/get-file-type-from-buffer`를 직접
  조합하세요.
- 파일명이 항상 `image.<ext>`라 같은 `dest`에 여러 번 받으면 덮어씁니다.
- HTTP 상태 코드나 이미지 여부를 따로 확인하지 않습니다. 판별 가능한 형식이면 그대로 저장합니다.
