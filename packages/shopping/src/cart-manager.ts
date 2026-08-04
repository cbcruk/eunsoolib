/** 장바구니에 담기는 상품 */
export type CartProduct = {
  id: CartProductId
}

/** 상품을 식별하는 키 */
export type CartProductId = string

type CartItems = Map<CartProductId, CartProduct>

/**
 * 장바구니 담기/빼기를 관리하는 매니저
 *
 * 같은 `id`는 덮어써지므로 중복 없이 최대 3개까지 담을 수 있다.
 * 직렬화({@link CartManager.toJSON})와 복원({@link CartManager.fromJSON})을
 * 지원해 localStorage 등에 그대로 보관할 수 있다.
 *
 * @example
 * ```ts
 * const cart = new CartManager()
 * cart.add({ id: 'p1' })
 * cart.getItems() // [{ id: 'p1' }]
 * ```
 */
export class CartManager {
  private items: CartItems = new Map()
  /** 장바구니에 담을 수 있는 최대 상품 수 */
  private readonly MAX_COUNT = 3

  /**
   * @param initialItems - 초기 상품 목록. 복사되므로 원본은 변경되지 않는다
   */
  constructor(initialItems?: CartItems) {
    if (initialItems) {
      this.items = new Map(initialItems)
    }
  }

  /**
   * 상품을 담는다. 같은 `id`가 이미 있으면 덮어쓴다
   *
   * @param product - 담을 상품
   * @throws 이미 최대 개수(3개)만큼 담겨 있는 경우
   */
  add(product: CartProduct) {
    if (this.items.size >= this.MAX_COUNT) {
      throw new Error('장바구니가 가득 찼습니다.')
    }

    this.items.set(product.id, product)
  }

  /**
   * 상품을 빼낸다. 없는 `id`면 아무 일도 하지 않는다
   *
   * @param id - 제거할 상품의 키
   */
  delete(id: CartProductId) {
    this.items.delete(id)
  }

  /** 담긴 상품을 배열로 반환 */
  getItems(): CartProduct[] {
    return Array.from(this.items.values())
  }

  /** 직렬화 가능한 `[id, product]` 배열로 변환 */
  toJSON() {
    return Array.from(this.items.entries())
  }

  /**
   * {@link CartManager.toJSON} 결과 문자열로부터 복원
   *
   * @param data - `JSON.stringify(cart)` 결과
   */
  static fromJSON(data: string): CartManager {
    const entries: [CartProductId, CartProduct][] = JSON.parse(data)

    return new CartManager(new Map(entries))
  }
}
