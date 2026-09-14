# @cbcruk/vtt-to-json

WebVTT 자막을 중복 제거된 cue 배열로 파싱합니다.

YouTube 자동 생성 자막처럼 같은 문장이 다음 cue에 반복되고 단어별 `<c>` 태그 줄이 섞인 형식을
염두에 둔 가벼운 파서입니다. 전체 WebVTT 명세를 구현하지는 않습니다.

## 설치

```bash
pnpm add @cbcruk/vtt-to-json
```

## 사용법

```ts
import { readFile } from 'node:fs/promises'
import { VttParser } from '@cbcruk/vtt-to-json'

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

위에서부터 한 줄씩 읽으며, 각 줄은 `trim`한 뒤 처리합니다. `toJson()`은 호출할 때마다 파싱 상태를
새로 만들므로 같은 인스턴스에서 여러 번 호출해도 결과가 같습니다.

- `HH:mm:ss.SSS --> ` 또는 시를 생략한 `mm:ss.SSS --> ` 로 시작하는 줄은 이후 텍스트의 시작 시각이
  됩니다. 종료 시각과 cue 설정은 버립니다.
- 첫 타임스탬프 이전의 줄(`WEBVTT` 헤더 등)은 무시합니다.
- 타이밍 줄 바로 앞의 cue 식별자 줄과 `NOTE` / `STYLE` / `REGION` 블록(다음 빈 줄까지)은
  무시합니다.
- 공백만 있는 줄은 버립니다. 완전히 빈 줄은 블록의 끝으로 봅니다.
- **바로 직전 cue와 같은 텍스트**와 `</c>`로 끝나는 줄은 건너뜁니다.
- 나머지 줄은 한 줄당 cue 하나가 됩니다. 여러 줄짜리 cue는 같은 시각의 cue 여러 개가 됩니다.

### `Cue`

| 필드        | 타입     | 설명                                                   |
| ----------- | -------- | ------------------------------------------------------ |
| `seconds`   | `number` | 시작 시각(초)                                          |
| `timestamp` | `string` | 원본 시작 타임스탬프 (`HH:mm:ss.SSS` 또는 `mm:ss.SSS`) |
| `text`      | `string` | 자막 텍스트 (태그는 제거하지 않음)                     |

## 제약

- 전체 WebVTT 명세를 검증하지 않습니다. 타이밍 줄의 종료 시각·cue 설정, cue 본문의 태그와
  엔티티는 해석하지 않습니다.
- 타임스탬프는 원본 문자열 그대로 반환하므로 `HH:mm:ss.SSS`와 `mm:ss.SSS`가 섞일 수 있습니다.
  비교·정렬에는 `seconds`를 사용하세요.
