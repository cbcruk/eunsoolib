import { createActor } from 'xstate'
import { describe, it, expect, beforeEach } from 'vitest'
import { cartMachine } from './cart-machine'

function createProduct(id: string) {
  return {
    id,
  }
}

function createCartMachineActor() {
  return createActor(cartMachine)
}

describe('cartMachine', () => {
  let actor: ReturnType<typeof createCartMachineActor>

  beforeEach(() => {
    actor = createCartMachineActor()
    actor.start()
  })

  it('상품을 추가할 수 있다', () => {
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })

    const items = actor.getSnapshot().context.items

    expect(items.has('a')).toBe(true)
  })

  it('상품을 삭제할 수 있다', () => {
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })
    actor.send({ type: 'DELETE', params: { id: 'a' } })

    const items = actor.getSnapshot().context.items

    expect(items.has('a')).toBe(false)
  })

  it('상품은 최대 3개까지만 추가할 수 있다', () => {
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })
    actor.send({ type: 'ADD', params: { product: createProduct('b') } })
    actor.send({ type: 'ADD', params: { product: createProduct('c') } })
    actor.send({ type: 'ADD', params: { product: createProduct('d') } })

    const items = actor.getSnapshot().context.items

    expect(items.size).toBe(3)
    expect(items.has('d')).toBe(false)
  })

  it('RESET 이벤트로 장바구니를 초기화할 수 있다', () => {
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })
    actor.send({ type: 'RESET' })

    const items = actor.getSnapshot().context.items

    expect(items.size).toBe(0)
  })

  it('actor마다 독립된 items를 가진다', () => {
    const other = createCartMachineActor()
    other.start()

    actor.send({ type: 'ADD', params: { product: createProduct('a') } })

    expect(actor.getSnapshot().context.items.has('a')).toBe(true)
    expect(other.getSnapshot().context.items.size).toBe(0)
  })

  it('RESET 뒤에도 actor끼리 items를 공유하지 않는다', () => {
    const other = createCartMachineActor()
    other.start()

    actor.send({ type: 'RESET' })
    other.send({ type: 'RESET' })
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })

    expect(other.getSnapshot().context.items.size).toBe(0)
  })

  it('ADD/DELETE는 이전 스냅샷을 바꾸지 않고 새 Map 참조를 만든다', () => {
    const initial = actor.getSnapshot().context.items

    actor.send({ type: 'ADD', params: { product: createProduct('a') } })

    const added = actor.getSnapshot().context.items

    expect(added).not.toBe(initial)
    expect(initial.size).toBe(0)

    actor.send({ type: 'DELETE', params: { id: 'a' } })

    const deleted = actor.getSnapshot().context.items

    expect(deleted).not.toBe(added)
    expect(added.has('a')).toBe(true)
    expect(deleted.has('a')).toBe(false)
  })

  it('한도에 도달해도 이미 담긴 id는 덮어쓸 수 있다', () => {
    actor.send({ type: 'ADD', params: { product: createProduct('a') } })
    actor.send({ type: 'ADD', params: { product: createProduct('b') } })
    actor.send({ type: 'ADD', params: { product: createProduct('c') } })

    const updated = { id: 'a', name: 'updated' }

    actor.send({ type: 'ADD', params: { product: updated } })

    const items = actor.getSnapshot().context.items

    expect(items.size).toBe(3)
    expect(items.get('a')).toBe(updated)
  })
})
