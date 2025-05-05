import { beforeEach, describe, expect, it } from 'vitest'
import { LikeManager, type Item } from './like-manager'

const mockItem = (id: number) =>
  ({
    id,
    name: `상품${id}`,
    image: `image-${id}.jpg`,
    price: 1000 * id,
  } satisfies Item)

describe('LikeManager', () => {
  let manager: LikeManager

  beforeEach(() => {
    manager = new LikeManager()
  })

  it('초기 상태는 빈 배열이다', () => {
    expect(manager.getItems()).toEqual([])
  })

  it('아이템을 추가할 수 있다', () => {
    const item = mockItem(1)

    manager.add(item)

    expect(manager.getItems()).toEqual([item])
  })

  it('같은 아이템은 중복 추가되지 않는다', () => {
    const item = mockItem(1)

    manager.add(item)
    manager.add(item)

    expect(manager.getItems()).toHaveLength(1)
  })

  it('아이템을 제거할 수 있다', () => {
    const item1 = mockItem(1)
    const item2 = mockItem(2)

    manager.add(item1)
    manager.add(item2)
    manager.remove(item1.id)

    expect(manager.getItems()).toEqual([item2])
  })

  it('여러 아이템을 제거할 수 있다', () => {
    const item1 = mockItem(1)
    const item2 = mockItem(2)
    const item3 = mockItem(3)

    manager.add(item1)
    manager.add(item2)
    manager.add(item3)
    manager.removeMany([1, 3])

    expect(manager.getItems()).toEqual([item2])
  })

  it('clear()를 호출하면 찜 목록이 비워진다', () => {
    const item = mockItem(1)

    manager.add(item)
    manager.clear()

    expect(manager.getItems()).toEqual([])
  })
})
