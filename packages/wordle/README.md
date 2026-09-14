# @eunsoolib/wordle

워들 게임 로직, 공유 코드 인코딩, 경과 시간 타이머를 담은 패키지입니다.

5글자 단어를 6번 안에 맞히는 워들의 판정 규칙을 UI 없이 모델링한 설계 실험입니다. 정답 단어는 비동기 사전 검증을 거쳐야 게임이 만들어지고, 추측 목록에서 글자별 상태와 게임 상태를 계산합니다.

## 설치

```bash
pnpm add @eunsoolib/wordle
```

기본 사전 검증기 `hasWordDefinitions`는 `fetch`로 [Free Dictionary API](https://dictionaryapi.dev/)(영어)를 호출하므로 네트워크가 필요합니다.

## 사용법

```ts
import { GAME_STATUS, Wordle, WordleCodec } from '@eunsoolib/wordle'

// 공유 링크의 ?code=YXBwbGU= 에서 정답 복원
const answer = WordleCodec.decode('YXBwbGU=') // 'apple'

const game = await Wordle.create(answer) // 사전에 없으면 reject

game.addGuessItem('allee')
game.getGuessListWithStatus()
// [[
//   { char: 'a', status: 'Correct' },
//   { char: 'l', status: 'Partial' },
//   { char: 'l', status: 'Incorrect' },
//   { char: 'e', status: 'Incorrect' },
//   { char: 'e', status: 'Correct' },
// ]]

game.getGameStatus() === GAME_STATUS.Playing // true
```

검증기를 바꾸거나 테스트에서 네트워크를 피하려면 두 번째 인자로 넘깁니다.

```ts
const game = await Wordle.create('apple', async (word) => myWordSet.has(word))
```

## API

### `Wordle.create(answer?, validate = hasWordDefinitions)`

`Promise<Wordle>`을 반환합니다. 생성자는 private입니다. 다음 경우 `Error`로 reject합니다.

| 조건                      | 메시지                      |
| ------------------------- | --------------------------- |
| `answer`가 비어 있음      | `MESSAGES.REQUIRED_ERROR`   |
| 길이가 5가 아님           | `MESSAGES.LENGTH_ERROR`     |
| `validate`가 `false` 반환 | `MESSAGES.DEFINITION_ERROR` |

### 인스턴스

| 멤버                       | 설명                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `guessList`                | 입력한 추측 `Word[]` (public 필드)                          |
| `addGuessItem(guess)`      | 추측 추가. 5글자가 아니거나 이미 6개면 `Error`              |
| `getGuessListWithStatus()` | 추측마다 `GuessItemWithStatus[]` 배열                       |
| `getGameStatus()`          | 정답을 맞혔거나 6번 입력했으면 `'Over'`, 아니면 `'Playing'` |

### `WordleCodec`

`WordleCodec.encode(answer)` / `WordleCodec.decode(encoded)` — `btoa`/`atob` 기반 Base64 변환입니다. 정답을 URL에서 한눈에 안 보이게 하는 용도일 뿐 암호화가 아니며, Latin-1 밖의 문자(한글 등)는 인코딩할 수 없습니다.

### `new WordleTimer({ id, initialTime = 0, interval = 1000 })`

경과 시간 카운터. `start()`(중복 호출 무시) / `stop()` / `reset()`(0으로, 정지) / `getTime()`. `interval`마다 `time`이 1씩 증가합니다.

### 상수·타입

- `GUESS_STATUS`: `Correct` · `Partial` · `Incorrect` · `Typing`
- `GAME_STATUS`: `Over` · `Playing`
- `ANSWER_MAX_LENGTH` = `5`(단어 길이), `GUESS_MAX_LENGTH` = `6`(추측 횟수)
- `MESSAGES`: 에러 메시지 문자열
- `Word` = `string`, `DictionaryValidator` = `(word: Word) => Promise<boolean>`, `GuessItemWithStatus` = `{ char, status }`
- `hasWordDefinitions`: 기본 `DictionaryValidator`

## 설계 노트

### 판정 규칙

중복 글자를 워들 원작처럼 처리하기 위해 두 단계로 판정합니다.

1. 같은 자리의 글자가 일치하면 `Correct`로 표시하고, 정답의 그 글자를 소비합니다.
2. 남은 글자는 왼쪽부터, 아직 소비되지 않은 정답 글자에 있으면 `Partial`로 표시하고 하나를 소비합니다. 없으면 `Incorrect`입니다.

그래서 정답 `apple`에 `allee`를 넣으면 두 번째 `l`과 첫 번째 `e`는 `Incorrect`가 됩니다(테스트로 검증).

### 범위

- 추측 단어는 사전 검증을 하지 않고, 대소문자도 정규화하지 않습니다.
- `getGameStatus()`는 승리와 패배를 구분하지 않습니다. 인스턴스에 정답 getter가 없으므로, 필요하면 `create()`에 넘긴 정답과 `guessList`를 호출하는 쪽에서 비교합니다.
- 상태는 매번 `guessList`에서 다시 계산하며 따로 저장하지 않습니다.
