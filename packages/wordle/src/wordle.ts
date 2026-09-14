import {
  GUESS_STATUS,
  MESSAGES,
  GAME_STATUS,
  ANSWER_MAX_LENGTH,
  GUESS_MAX_LENGTH,
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
 * ```
 */
export class Wordle {
  /** 입력한 추측 단어 목록(입력 순). */
  guessList: Word[] = []

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

    if (answer.length !== ANSWER_MAX_LENGTH) {
      throw new Error(MESSAGES.LENGTH_ERROR)
    }

    const hasDefinitions = await validate(answer)

    if (!hasDefinitions) {
      throw new Error(MESSAGES.DEFINITION_ERROR)
    }

    return new Wordle(answer)
  }

  /**
   * 추측 단어를 목록에 추가한다.
   *
   * @throws 5글자가 아니거나 이미 6번 추측했으면 `Error`를 던진다.
   */
  addGuessItem(guess: Word) {
    if (guess.length !== ANSWER_MAX_LENGTH) {
      throw new Error(MESSAGES.LENGTH_ERROR)
    }

    if (this.guessList.length >= GUESS_MAX_LENGTH) {
      throw new Error('더 이상 입력할 수 없습니다.')
    }

    this.guessList = this.guessList.concat(guess)
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
    return this.guessList.map((guess) => this.judgeGuess(guess))
  }

  /** 정답을 맞혔거나 6번 추측했으면 `'Over'`, 아니면 `'Playing'`을 반환한다. */
  getGameStatus() {
    /** 정답 */
    const hasCorrectGuess = this.guessList.includes(this.answer)
    /** 6번 시도 */
    const hasReachedLimit = this.guessList.length >= GUESS_MAX_LENGTH

    return hasCorrectGuess || hasReachedLimit
      ? GAME_STATUS.Over
      : GAME_STATUS.Playing
  }
}
