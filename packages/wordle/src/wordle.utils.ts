import type { DictionaryValidator } from './wordle.types'

export const hasWordDefinitions: DictionaryValidator = async (word) => {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
  )

  return response.ok
}
