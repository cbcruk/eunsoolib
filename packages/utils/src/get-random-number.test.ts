import { expect, test } from 'vitest'
import { getRandomNumber } from './get-random-number'

test('getRandomNumber', () => {
  const min = 1
  const max = 10

  for (let i = 0; i < 100; i++) {
    const value = getRandomNumber({ min, max })

    expect(value).toBeGreaterThanOrEqual(min)
    expect(value).toBeLessThanOrEqual(max)
  }
})
