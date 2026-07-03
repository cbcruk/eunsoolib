import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { likeStore, likeActions } from './like-store'
import { useLikes, useIsLiked } from './use-like-store'
import { type Item } from './like-item'

const mockItem = (id: number) =>
  ({
    id,
    name: `상품${id}`,
    image: `image-${id}.jpg`,
    price: 1000 * id,
  }) satisfies Item

describe('useLikes / useIsLiked', () => {
  beforeEach(() => {
    likeStore.setState([])
  })

  it('selector 없이 전체 찜 목록을 반환한다', () => {
    const { result } = renderHook(() => useLikes())

    expect(result.current).toEqual([])
  })

  it('액션으로 상태가 바뀌면 리렌더된다', () => {
    const { result } = renderHook(() => useLikes())

    act(() => {
      likeActions.add(mockItem(1))
    })

    expect(result.current).toEqual([mockItem(1)])
  })

  it('selector로 파생 값을 구독할 수 있다', () => {
    const { result } = renderHook(() => useLikes((items) => items.length))

    expect(result.current).toBe(0)

    act(() => {
      likeActions.add(mockItem(1))
    })

    expect(result.current).toBe(1)
  })

  it('useIsLiked는 특정 아이템의 찜 여부를 반환한다', () => {
    const { result } = renderHook(() => useIsLiked(1))

    expect(result.current).toBe(false)

    act(() => {
      likeActions.add(mockItem(1))
    })

    expect(result.current).toBe(true)
  })

  it('여러 컴포넌트가 동일한 싱글턴 store를 공유한다', () => {
    const first = renderHook(() => useLikes((items) => items.length))
    const second = renderHook(() => useLikes((items) => items.length))

    act(() => {
      likeActions.add(mockItem(1))
    })

    expect(first.result.current).toBe(1)
    expect(second.result.current).toBe(1)
  })
})
