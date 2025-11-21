import { expect, test, vi } from 'vitest'
import { iteratePaginated } from './iterate-paginated'

test('iteratePaginated', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ items: [1, 2], nextState: 'next' })
    .mockResolvedValueOnce({ items: [3], nextState: undefined })

  const result: number[] = []

  for await (const item of iteratePaginated<number, 'next' | undefined>(
    fetchMock,
    undefined
  )) {
    result.push(item)
  }

  expect(result).toEqual([1, 2, 3])
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenNthCalledWith(1, undefined)
  expect(fetchMock).toHaveBeenNthCalledWith(2, 'next')
})

test('`nextState`가 `undefined`일 경우', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ items: [], nextState: undefined })

  const result: number[] = []

  for await (const item of iteratePaginated<number, 'next' | undefined>(
    fetchMock
  )) {
    result.push(item)
  }

  expect(result).toEqual([])
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
