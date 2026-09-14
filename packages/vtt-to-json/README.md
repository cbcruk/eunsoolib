# @eunsoolib/vtt-to-json

WebVTT 자막을 중복 제거된 cue 배열로 파싱합니다.

YouTube 자동 생성 자막처럼 같은 문장이 다음 cue에 반복되고 단어별 `<c>` 태그 줄이 섞인 형식을
염두에 둔 가벼운 파서입니다. 전체 WebVTT 명세를 구현하지는 않습니다.

## 설치

```bash
pnpm add @eunsoolib/vtt-to-json
```

## 사용법

```ts
import { readFile } from 'node:fs/promises'
import { VttParser } from '@eunsoolib/vtt-to-json'

const vtt = await readFile('captions.vtt', 'utf-8')
const cues = new VttParser(vtt).toJson()
// [
//   { seconds: 2.63, timestamp: '00:00:02.630', text: '[Music]' },
//   { seconds: 12.15, timestamp: '00:00:12.150', text: "Yeah, I love you. I'm in a funk, so I" },
//   ...
// ]
```

## API

### `new VttParser(data)`

WebVTT 원본 텍스트를 받습니다.

### `parser.toJson()`

`Cue[]`를 반환합니다. JSON 문자열이 아니라 객체 배열입니다.

각 줄을 `trim`한 뒤 빈 줄을 버리고 위에서부터 읽습니다.

- `HH:mm:ss.SSS --> ` 로 시작하는 줄은 이후 텍스트의 시작 시각이 됩니다. 종료 시각과 cue 설정은
  버립니다.
- 첫 타임스탬프 이전의 줄(`WEBVTT` 헤더 등)은 무시합니다.
- **바로 직전 cue와 같은 텍스트**와 `</c>`로 끝나는 줄은 건너뜁니다.
- 나머지 줄은 한 줄당 cue 하나가 됩니다. 여러 줄짜리 cue는 같은 시각의 cue 여러 개가 됩니다.

### `Cue`

| 필드        | 타입     | 설명                                  |
| ----------- | -------- | ------------------------------------- |
| `seconds`   | `number` | 시작 시각(초)                         |
| `timestamp` | `string` | 원본 시작 타임스탬프 (`HH:mm:ss.SSS`) |
| `text`      | `string` | 자막 텍스트 (태그는 제거하지 않음)    |

## 제약

- 시(`HH:`)가 생략된 `mm:ss.SSS` 타임스탬프는 인식하지 못합니다.
- cue 식별자 줄, `NOTE`/`STYLE` 블록은 따로 처리하지 않아 첫 타임스탬프 이후에 나오면 텍스트
  cue로 들어갑니다.
- 파싱 상태를 인스턴스에 저장하므로 `toJson()`은 인스턴스당 한 번만 호출하세요. 다시 파싱하려면
  새 인스턴스를 만듭니다.
