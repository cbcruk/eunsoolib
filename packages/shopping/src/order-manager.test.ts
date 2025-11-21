import { describe, it, expect, beforeEach } from 'vitest'
import { OrderManager } from './order-manager'

describe('OrderManager', () => {
  let manager: OrderManager

  beforeEach(() => {
    manager = new OrderManager()
  })

  it('기본 수량은 1이고 체크는 false여야 한다', () => {
    expect(manager.getQty('item1')).toBe(1)
    expect(manager.isChecked('item1')).toBe(false)
  })

  it('수량을 설정하고 조회할 수 있다', () => {
    manager.setQty('item1', 3)

    expect(manager.getQty('item1')).toBe(3)
  })

  it('체크 상태를 토글할 수 있다', () => {
    manager.toggleCheck('item1')

    expect(manager.isChecked('item1')).toBe(true)

    manager.toggleCheck('item1')

    expect(manager.isChecked('item1')).toBe(false)
  })

  it('직렬화/역직렬화가 동작해야 한다', () => {
    manager.setQty('item1', 5)
    manager.toggleCheck('item1')

    const json = JSON.stringify(manager.toJSON())
    const restored = OrderManager.fromJSON(json)

    expect(restored.getQty('item1')).toBe(5)
    expect(restored.isChecked('item1')).toBe(true)
  })
})
