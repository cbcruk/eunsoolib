import type { DictionaryValidator } from './wordle.types'

/**
 * Free Dictionary API(`api.dictionaryapi.dev`)에 영어 단어 정의가 있는지 확인한다.
 *
 * 응답이 `ok`(2xx)면 `true`로 resolve한다. `Wordle.create`의 기본 검증 함수다.
 */
export const hasWordDefinitions: DictionaryValidator = async (word) => {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
  )

  return response.ok
}
