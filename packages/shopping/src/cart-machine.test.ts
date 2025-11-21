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
})
