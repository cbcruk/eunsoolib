# @cbcruk/get-file-type-from-buffer

버퍼의 매직 넘버를 읽어 파일 형식(확장자·MIME 타입)을 판별하는 Effect 함수입니다.

파일명이나 확장자가 아니라 실제 바이트를 보고 판단하므로 업로드된 파일 검증에 쓸 수 있습니다.
판별은 [`file-type`](https://github.com/sindresorhus/file-type)의 `fileTypeFromBuffer`에
위임합니다.

## 설치

```bash
pnpm add @cbcruk/get-file-type-from-buffer effect
```

반환값이 Effect이므로 실행하려면 `effect`가 필요합니다. 입력은 `Uint8Array` 또는 `ArrayBuffer`이며,
Node `Buffer`는 `Uint8Array`이므로 그대로 넘길 수 있습니다.

## 사용법

```ts
import { readFile } from 'node:fs/promises'
import { Effect } from 'effect'
import { getFileTypeFromBuffer } from '@cbcruk/get-file-type-from-buffer'

const buffer = await readFile('photo.jpg')
const { ext, mime } = await Effect.runPromise(getFileTypeFromBuffer(buffer))
// ext: 'jpg', mime: 'image/jpeg'
```

### 실패 처리

실패는 `FileTypeFromBufferError`로 표현되므로 `_tag`로 잡을 수 있습니다.

```ts
const program = getFileTypeFromBuffer(buffer).pipe(
  Effect.catchTag('FileTypeFromBufferError', () =>
    Effect.succeed({ ext: 'bin', mime: 'application/octet-stream' }),
  ),
)

const fileType = await Effect.runPromise(program)
```

## API

### `getFileTypeFromBuffer(buffer)`

`Effect<{ ext, mime }, FileTypeFromBufferError>`를 반환합니다. `{ ext, mime }`은 `file-type`의
판별 결과 객체입니다.

| 인자     | 타입                        | 설명                                         |
| -------- | --------------------------- | -------------------------------------------- |
| `buffer` | `Uint8Array \| ArrayBuffer` | 검사할 파일의 바이너리(Node `Buffer`도 가능) |

### `FileTypeFromBufferError`

`Data.TaggedError('FileTypeFromBufferError')` 기반 에러입니다(`message`, `cause?`).

| 상황                 | `message`                         | `cause`   |
| -------------------- | --------------------------------- | --------- |
| 판별 중 예외 발생    | `파일 형식 판별 중 오류 발생`     | 원래 예외 |
| 형식을 식별하지 못함 | `파일 형식을 식별할 수 없습니다.` | —         |

### `getfileTypeFromBuffer`

오타가 있던 이전 이름으로, `getFileTypeFromBuffer`와 같은 함수입니다. `@deprecated`이니 새
코드에서는 쓰지 마세요.
