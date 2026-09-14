# @cbcruk/wordle

워들 게임 로직, 공유 코드 인코딩, 경과 시간 타이머를 담은 패키지입니다.

5글자 단어를 6번 안에 맞히는 워들의 판정 규칙을 UI 없이 모델링한 설계 실험입니다. 정답 단어는 비동기 사전 검증을 거쳐야 게임이 만들어지고, 추측 목록에서 글자별 상태와 게임 상태를 계산합니다.

## 설치

```bash
pnpm add @cbcruk/wordle
```

기본 사전 검증기 `hasWordDefinitions`는 `fetch`로 [Free Dictionary API](https://dictionaryapi.dev/)(영어)를 호출하므로 네트워크가 필요합니다.

## 사용법

```ts
import { GAME_STATUS, Wordle, WordleCodec } from '@cbcruk/wordle'

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

game.addGuessItem('apple')
game.getGameResult() // 'Won'
game.addGuessItem('grape') // 게임이 끝나 Error
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

| 멤버                       | 설명                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `guessList`                | 입력한 추측 `readonly Word[]`의 복사본 (읽기 전용 getter)                                        |
| `addGuessItem(guess)`      | 추측 추가. 5글자가 아니면 `LENGTH_ERROR`, 정답을 맞혔거나 이미 6개면 `GAME_OVER_ERROR`의 `Error` |
| `getGuessListWithStatus()` | 추측마다 `GuessItemWithStatus[]` 배열                                                            |
| `getGameStatus()`          | 정답을 맞혔거나 6번 입력했으면 `'Over'`, 아니면 `'Playing'`                                      |
| `getGameResult()`          | 정답을 맞혔으면 `'Won'`, 6번 모두 틀렸으면 `'Lost'`, 진행 중이면 `null`                          |

### `WordleCodec`

`WordleCodec.encode(answer)` / `WordleCodec.decode(encoded)` — `TextEncoder`로 만든 UTF-8 바이트를 Base64로 바꿉니다. 한글 같은 Latin-1 밖의 문자도 인코딩할 수 있고, ASCII 단어는 `btoa(answer)`와 결과가 같습니다. 정답을 URL에서 한눈에 안 보이게 하는 용도일 뿐 암호화가 아닙니다.

### `new WordleTimer({ id?, initialTime = 0, interval = 1000 })`

경과 시간 카운터. `start()`(중복 호출 무시) / `stop()` / `reset()`(`initialTime`으로, 정지) / `getTime()`. `interval`마다 `time`이 1씩 증가합니다. `id`는 여러 타이머를 구분하는 식별자로, 읽기 전용 `timer.id`로 다시 읽을 수 있습니다.

### 상수·타입

- `GUESS_STATUS`: `Correct` · `Partial` · `Incorrect` · `Typing`
- `GAME_STATUS`: `Over` · `Playing`
- `GAME_RESULT`: `Won` · `Lost`
- `WORD_LENGTH` = `5`(단어 길이), `MAX_GUESSES` = `6`(추측 횟수). 이전 이름 `ANSWER_MAX_LENGTH` · `GUESS_MAX_LENGTH`는 같은 값의 deprecated 별칭입니다.
- `MESSAGES`: 에러 메시지 문자열 (`REQUIRED_ERROR` · `LENGTH_ERROR` · `DEFINITION_ERROR` · `GAME_OVER_ERROR`)
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
- `getGameStatus()`는 진행 여부만 알려 주고, 승패는 `getGameResult()`로 구분합니다. 인스턴스에 정답 getter는 없습니다.
- 추측 기록은 `addGuessItem()`으로만 바뀌고, 게임이 끝난 뒤에는 추가되지 않습니다. 상태는 매번 추측 기록에서 다시 계산하며 따로 저장하지 않습니다.
