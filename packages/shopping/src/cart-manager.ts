export type CartProduct = {
  id: CartProductId
}

export type CartProductId = string

type CartItems = Map<CartProductId, CartProduct>

export class CartManager {
  private items: CartItems = new Map()
  private readonly MAX_COUNT = 3

  constructor(initialItems?: CartItems) {
    if (initialItems) {
      this.items = new Map(initialItems)
    }
  }

  add(product: CartProduct) {
    if (this.items.size >= this.MAX_COUNT) {
      throw new Error('장바구니가 가득 찼습니다.')
    }

    this.items.set(product.id, product)
  }

  delete(id: CartProductId) {
    this.items.delete(id)
  }

  getItems(): CartProduct[] {
    return Array.from(this.items.values())
  }

  toJSON() {
    return Array.from(this.items.entries())
  }

  static fromJSON(data: string): CartManager {
    const entries: [CartProductId, CartProduct][] = JSON.parse(data)

    return new CartManager(new Map(entries))
  }
}
