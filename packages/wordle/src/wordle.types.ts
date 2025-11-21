import type { GUESS_STATUS } from './wordle.constants'

export type Word = string

export type DictionaryValidator = (word: Word) => Promise<boolean>

export type GuessItemWithStatus = {
  char: Word
  status: keyof typeof GUESS_STATUS
}
