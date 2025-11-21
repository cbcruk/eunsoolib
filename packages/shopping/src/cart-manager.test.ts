import { describe, it, expect, beforeEach } from 'vitest'
import { CartManager, type CartProduct } from './cart-manager'

describe('CartManager', () => {
  let cart: CartManager

  const productA: CartProduct = { id: 'a' }
  const productB: CartProduct = { id: 'b' }
  const productC: CartProduct = { id: 'c' }
  const productD: CartProduct = { id: 'd' }

  beforeEach(() => {
    cart = new CartManager()
  })

  it('초기 상태는 비어 있어야 한다', () => {
    expect(cart.getItems()).toEqual([])
  })

  it('상품을 추가할 수 있다', () => {
    cart.add(productA)

    expect(cart.getItems()).toEqual([productA])
  })

  it('동일한 ID의 상품은 덮어쓰기 된다', () => {
    cart.add(productA)
    cart.add({ id: 'a' })

    expect(cart.getItems().length).toBe(1)
  })

  it('상품을 삭제할 수 있다', () => {
    cart.add(productA)
    cart.delete(productA.id)

    expect(cart.getItems()).toEqual([])
  })

  it('최대 상품 수를 초과하면 예외를 던진다', () => {
    cart.add(productA)
    cart.add(productB)
    cart.add(productC)

    expect(() => cart.add(productD)).toThrowError('장바구니가 가득 찼습니다.')
  })

  it('직렬화/역직렬화가 정상적으로 동작한다', () => {
    cart.add(productA)
    cart.add(productB)

    const json = JSON.stringify(cart.toJSON())
    const restoredCart = CartManager.fromJSON(json)

    expect(restoredCart.getItems()).toEqual([productA, productB])
  })
})
