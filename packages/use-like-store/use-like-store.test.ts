import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLikesStore, type LikesItem } from './use-like-store'

const mockItem = (id: number): LikesItem => ({
  id,
  name: `상품${id}`,
  image: `image-${id}.jpg`,
  price: 1000 * id,
})

describe('useLikesStore', () => {
  it('초기 상태는 빈 배열이다', () => {
    const { result } = renderHook(() => useLikesStore())

    expect(result.current.likes).toEqual([])
  })

  it('아이템을 추가할 수 있다', () => {
    const { result } = renderHook(() => useLikesStore())

    const item = mockItem(1)

    act(() => {
      result.current.addItem(item)
    })

    expect(result.current.likes).toEqual([item])
  })

  it('같은 아이템은 중복 추가되지 않는다', () => {
    const { result } = renderHook(() => useLikesStore())

    const item = mockItem(1)

    act(() => {
      result.current.addItem(item)
      result.current.addItem(item)
    })

    expect(result.current.likes).toHaveLength(1)
  })

  it('아이템을 제거할 수 있다', () => {
    const { result } = renderHook(() => useLikesStore())

    const item1 = mockItem(1)
    const item2 = mockItem(2)

    act(() => {
      result.current.addItem(item1)
      result.current.addItem(item2)
      result.current.removeItem(item1.id)
    })

    expect(result.current.likes).toEqual([item2])
  })

  it('여러 아이템을 제거할 수 있다', () => {
    const { result } = renderHook(() => useLikesStore())

    const item1 = mockItem(1)
    const item2 = mockItem(2)
    const item3 = mockItem(3)

    act(() => {
      result.current.addItem(item1)
      result.current.addItem(item2)
      result.current.addItem(item3)
      result.current.removeItems([1, 3])
    })

    expect(result.current.likes).toEqual([item2])
  })

  it('clear()를 호출하면 찜 목록이 비워진다', () => {
    const { result } = renderHook(() => useLikesStore())

    const item = mockItem(1)

    act(() => {
      result.current.addItem(item)
      result.current.clear()
    })

    expect(result.current.likes).toEqual([])
  })
})
