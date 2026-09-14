import { expect, test, vi } from 'vitest'
import { iteratePaginated, RepeatedCursorError } from './iterate-paginated'

test('iteratePaginated', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ items: [1, 2], nextState: 'next' })
    .mockResolvedValueOnce({ items: [3], nextState: undefined })

  const result: number[] = []

  for await (const item of iteratePaginated<number, 'next' | undefined>(
    fetchMock,
    undefined,
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
    fetchMock,
  )) {
    result.push(item)
  }

  expect(result).toEqual([])
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('`nextState`가 `null`이면 순회를 끝내야 함', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ items: [1], nextState: 'next' })
    .mockResolvedValueOnce({ items: [2], nextState: null })
    .mockResolvedValue({ items: [99], nextState: null })

  const result: number[] = []

  for await (const item of iteratePaginated<number, string>(fetchMock)) {
    result.push(item)
  }

  expect(result).toEqual([1, 2])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('`nextState`가 직전 커서와 같으면 RepeatedCursorError를 던져야 함', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ items: [1], nextState: 'a' })
    .mockResolvedValue({ items: [2], nextState: 'a' })

  const result: number[] = []

  await expect(async () => {
    for await (const item of iteratePaginated<number, string>(fetchMock)) {
      result.push(item)
    }
  }).rejects.toThrow(RepeatedCursorError)

  expect(result).toEqual([1, 2])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('initialState와 같은 커서가 돌아와도 RepeatedCursorError를 던져야 함', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ items: [], nextState: 'a' })

  await expect(async () => {
    for await (const _ of iteratePaginated<number, string>(fetchMock, 'a')) {
      // 소비만 한다
    }
  }).rejects.toBeInstanceOf(RepeatedCursorError)

  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('signal이 이미 중단되어 있으면 fetcher를 호출하지 않고 reason을 던져야 함', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ items: [1] })
  const controller = new AbortController()
  const reason = new Error('중단')
  controller.abort(reason)

  await expect(async () => {
    for await (const _ of iteratePaginated<number, string>(
      fetchMock,
      undefined,
      { signal: controller.signal },
    )) {
      // 소비만 한다
    }
  }).rejects.toBe(reason)

  expect(fetchMock).not.toHaveBeenCalled()
})

test('순회 중 signal이 중단되면 다음 아이템과 페이지를 요청하지 않아야 함', async () => {
  const controller = new AbortController()
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ items: [1, 2], nextState: 'next' })
    .mockResolvedValue({ items: [3], nextState: undefined })

  const result: number[] = []

  await expect(async () => {
    for await (const item of iteratePaginated<number, string>(
      fetchMock,
      undefined,
      { signal: controller.signal },
    )) {
      result.push(item)
      controller.abort()
    }
  }).rejects.toMatchObject({ name: 'AbortError' })

  expect(result).toEqual([1])
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
