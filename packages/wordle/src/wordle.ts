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

export class Wordle {
  guessList: Word[] = []

  private constructor(private readonly answer: Word) {
    this.answer = answer
  }

  static async create(
    answer?: Word,
    validate: DictionaryValidator = hasWordDefinitions
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
      guessChars[i] === char ? null : char
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

  getGuessListWithStatus() {
    return this.guessList.map((guess) => this.judgeGuess(guess))
  }

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
