import {
  GUESS_STATUS,
  MESSAGES,
  GAME_STATUS,
  GAME_RESULT,
  WORD_LENGTH,
  MAX_GUESSES,
} from './wordle.constants'
import type {
  DictionaryValidator,
  Word,
  GuessItemWithStatus,
} from './wordle.types'
import { hasWordDefinitions } from './wordle.utils'

/**
 * 5글자 정답을 6번 안에 맞히는 워들 게임의 추측 기록과 판정을 관리한다.
 *
 * 인스턴스는 {@link Wordle.create}로 만든다. 추측 단어는 사전 검증을 하지 않고 대소문자도 정규화하지 않는다.
 * 추측 기록은 {@link Wordle.addGuessItem}으로만 바뀌며, 게임이 끝나면 더 추가할 수 없다.
 *
 * @example
 * ```ts
 * import { Wordle } from '@cbcruk/wordle'
 *
 * const wordle = await Wordle.create('apple', async () => true)
 *
 * wordle.addGuessItem('allee')
 * wordle.getGuessListWithStatus()
 * wordle.getGameStatus() // 'Playing'
 *
 * wordle.addGuessItem('apple')
 * wordle.getGameResult() // 'Won'
 * ```
 */
export class Wordle {
  private guesses: Word[] = []

  private constructor(private readonly answer: Word) {
    this.answer = answer
  }

  /**
   * 정답을 검증해 게임 인스턴스를 만든다.
   *
   * @param answer - 5글자 정답 단어
   * @param validate - 정답이 사전에 있는지 확인하는 함수. 기본값은 {@link hasWordDefinitions}
   * @throws `answer`가 비었으면 `MESSAGES.REQUIRED_ERROR`, 5글자가 아니면 `MESSAGES.LENGTH_ERROR`,
   * `validate`가 `false`면 `MESSAGES.DEFINITION_ERROR` 메시지의 `Error`로 reject한다.
   */
  static async create(
    answer?: Word,
    validate: DictionaryValidator = hasWordDefinitions,
  ) {
    if (!answer) {
      throw new Error(MESSAGES.REQUIRED_ERROR)
    }

    if (answer.length !== WORD_LENGTH) {
      throw new Error(MESSAGES.LENGTH_ERROR)
    }

    const hasDefinitions = await validate(answer)

    if (!hasDefinitions) {
      throw new Error(MESSAGES.DEFINITION_ERROR)
    }

    return new Wordle(answer)
  }

  /**
   * 입력한 추측 단어 목록(입력 순)의 복사본.
   *
   * 읽기 전용이라 반환값을 바꿔도 게임 상태는 바뀌지 않는다. 추측은 {@link Wordle.addGuessItem}으로 추가한다.
   */
  get guessList(): readonly Word[] {
    return [...this.guesses]
  }

  /**
   * 추측 단어를 목록에 추가한다.
   *
   * @throws 5글자가 아니면 `MESSAGES.LENGTH_ERROR`, 이미 정답을 맞혔거나 6번 추측해 게임이 끝났으면
   * `MESSAGES.GAME_OVER_ERROR` 메시지의 `Error`를 던진다.
   */
  addGuessItem(guess: Word) {
    if (guess.length !== WORD_LENGTH) {
      throw new Error(MESSAGES.LENGTH_ERROR)
    }

    if (this.getGameStatus() === GAME_STATUS.Over) {
      throw new Error(MESSAGES.GAME_OVER_ERROR)
    }

    this.guesses = this.guesses.concat(guess)
  }

  private judgeGuess(guess: string) {
    const answer = this.answer
    const result: GuessItemWithStatus[] = []

    const answerChars = answer.split('')
    const guessChars = guess.split('')

    const matchedAnswer = answerChars.map((char, i) =>
      guessChars[i] === char ? null : char,
    )

    const matchedFlags = guessChars.map((char, i) => {
      if (char === answerChars[i]) {
        result[i] = {
          char,
          status: GUESS_STATUS.Correct,
        }

        return true
      }

      return false
    })

    guessChars.forEach((char, i) => {
      if (matchedFlags[i]) {
        return
      }

      const indexInRemaining = matchedAnswer.indexOf(char)

      if (indexInRemaining !== -1) {
        matchedAnswer[indexInRemaining] = null

        result[i] = {
          char,
          status: GUESS_STATUS.Partial,
        }
      } else {
        result[i] = {
          char,
          status: GUESS_STATUS.Incorrect,
        }
      }
    })

    return result
  }

  /**
   * 추측마다 글자별 판정 결과를 반환한다.
   *
   * 같은 자리 글자가 일치하면 `Correct`로 정답 글자를 먼저 소비하고, 남은 글자는 왼쪽부터
   * 소비되지 않은 정답 글자에 있으면 `Partial`, 없으면 `Incorrect`로 판정한다.
   *
   * @returns `guessList`와 같은 순서의 판정 결과 배열
   */
  getGuessListWithStatus() {
    return this.guesses.map((guess) => this.judgeGuess(guess))
  }

  /**
   * 정답을 맞혔거나 6번 추측했으면 `'Over'`, 아니면 `'Playing'`을 반환한다.
   *
   * 승패는 {@link Wordle.getGameResult}로 구분한다.
   */
  getGameStatus() {
    return this.getGameResult() === null
      ? GAME_STATUS.Playing
      : GAME_STATUS.Over
  }

  /**
   * 끝난 게임의 승패를 반환한다.
   *
   * @returns 정답을 맞혔으면 `'Won'`, 맞히지 못하고 6번 추측했으면 `'Lost'`, 아직 진행 중이면 `null`
   */
  getGameResult() {
    if (this.guesses.includes(this.answer)) {
      return GAME_RESULT.Won
    }

    if (this.guesses.length >= MAX_GUESSES) {
      return GAME_RESULT.Lost
    }

    return null
  }
}
