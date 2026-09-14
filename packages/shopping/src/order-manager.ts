import type { CartProductId } from './cart-manager'

type CheckedGroup = Map<CartProductId, boolean>
type QtyGroup = Map<CartProductId, number>

/**
 * 주문서에서 상품별 선택 여부와 수량을 관리하는 매니저
 *
 * 장바구니에 담긴 상품 중 무엇을 주문할지(체크)와 몇 개를 주문할지(수량)를
 * 상품 키 기준으로 따로 보관한다. 명시적으로 설정하지 않은 상품은 체크 해제
 * 상태이고 수량은 1로 간주한다.
 *
 * @example
 * ```ts
 * import { OrderManager } from '@cbcruk/shopping'
 *
 * const order = new OrderManager()
 * order.toggleCheck('p1') // 선택
 * order.setQty('p1', 3)
 * order.getQty('p1') // 3
 * ```
 */
export class OrderManager {
  private checked: CheckedGroup = new Map()
  private qty: QtyGroup = new Map()

  /**
   * @param checked - 초기 선택 상태. 복사되므로 원본은 변경되지 않는다
   * @param qty - 초기 수량. 복사되므로 원본은 변경되지 않는다
   */
  constructor(checked?: CheckedGroup, qty?: QtyGroup) {
    if (checked) this.checked = new Map(checked)
    if (qty) this.qty = new Map(qty)
  }

  /**
   * 상품의 선택 여부를 뒤집는다
   *
   * @param id - 대상 상품의 키
   */
  toggleCheck(id: CartProductId) {
    const current = this.checked.get(id) ?? false
    this.checked.set(id, !current)
  }

  /**
   * 상품의 주문 수량을 지정
   *
   * @param id - 대상 상품의 키
   * @param value - 설정할 수량
   */
  setQty(id: CartProductId, value: number) {
    this.qty.set(id, value)
  }

  /**
   * 상품의 주문 수량을 조회
   *
   * @returns 설정된 수량. 지정한 적 없으면 기본값 `1`
   */
  getQty(id: CartProductId): number {
    return this.qty.get(id) ?? 1
  }

  /**
   * 상품이 선택되었는지 조회
   *
   * @returns 선택 여부. 지정한 적 없으면 `false`
   */
  isChecked(id: CartProductId): boolean {
    return this.checked.get(id) ?? false
  }

  /** 선택 상태와 수량을 직렬화 가능한 형태로 변환 */
  toJSON() {
    return {
      checked: Array.from(this.checked.entries()),
      qty: Array.from(this.qty.entries()),
    }
  }

  /**
   * {@link OrderManager.toJSON} 결과 문자열로부터 복원
   *
   * @param json - `JSON.stringify(order)` 결과
   */
  static fromJSON(json: string) {
    const parsed = JSON.parse(json)
    const checked = new Map(parsed.checked) as CheckedGroup
    const qty = new Map(parsed.qty) as QtyGroup

    return new OrderManager(checked, qty)
  }
}
