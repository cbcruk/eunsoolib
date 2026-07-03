import { beforeEach, describe, expect, it, vi } from 'vitest'
import { likeStore, likeActions } from './like-store'
import { type Item } from './like-item'

const mockItem = (id: number) =>
  ({
    id,
    name: `상품${id}`,
    image: `image-${id}.jpg`,
    price: 1000 * id,
  }) satisfies Item

describe('likeStore / likeActions', () => {
  beforeEach(() => {
    likeStore.setState([])
  })

  it('초기 상태는 빈 배열이다', () => {
    expect(likeStore.getState()).toEqual([])
  })

  it('아이템을 추가할 수 있다', () => {
    const item = mockItem(1)

    likeActions.add(item)

    expect(likeStore.getState()).toEqual([item])
  })

  it('같은 아이템은 중복 추가되지 않는다', () => {
    const item = mockItem(1)

    likeActions.add(item)
    likeActions.add(item)

    expect(likeStore.getState()).toHaveLength(1)
  })

  it('중복 추가 시 상태 참조가 유지되어 구독자를 호출하지 않는다', () => {
    const item = mockItem(1)
    likeActions.add(item)

    const listener = vi.fn()
    likeStore.subscribe(listener)
    likeActions.add(item)

    expect(listener).not.toHaveBeenCalled()
  })

  it('아이템을 제거할 수 있다', () => {
    const item1 = mockItem(1)
    const item2 = mockItem(2)

    likeActions.add(item1)
    likeActions.add(item2)
    likeActions.remove(item1.id)

    expect(likeStore.getState()).toEqual([item2])
  })

  it('여러 아이템을 제거할 수 있다', () => {
    likeActions.add(mockItem(1))
    likeActions.add(mockItem(2))
    likeActions.add(mockItem(3))
    likeActions.removeMany([1, 3])

    expect(likeStore.getState()).toEqual([mockItem(2)])
  })

  it('toggle은 없으면 추가하고 있으면 제거한다', () => {
    const item = mockItem(1)

    likeActions.toggle(item)
    expect(likeActions.has(item.id)).toBe(true)

    likeActions.toggle(item)
    expect(likeActions.has(item.id)).toBe(false)
  })

  it('clear()를 호출하면 찜 목록이 비워진다', () => {
    likeActions.add(mockItem(1))
    likeActions.clear()

    expect(likeStore.getState()).toEqual([])
  })

  it('상태가 바뀌면 구독자에게 알린다', () => {
    const listener = vi.fn()

    likeStore.subscribe(listener)
    likeActions.add(mockItem(1))

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
