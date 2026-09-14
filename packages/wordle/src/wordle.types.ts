import type { GUESS_STATUS } from './wordle.constants'

/** 정답·추측 단어나 한 글자를 나타내는 문자열. */
export type Word = string

/** 단어가 사전에 있는지 비동기로 확인하는 함수. */
export type DictionaryValidator = (word: Word) => Promise<boolean>

/** 추측 단어의 한 글자와 그 판정 결과. */
export type GuessItemWithStatus = {
  /** 추측한 글자. */
  char: Word
  /** 판정 결과. */
  status: keyof typeof GUESS_STATUS
}
