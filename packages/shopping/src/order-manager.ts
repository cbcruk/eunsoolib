import type { CartProductId } from './cart-manager'

type CheckedGroup = Map<CartProductId, boolean>
type QtyGroup = Map<CartProductId, number>

export class OrderManager {
  private checked: CheckedGroup = new Map()
  private qty: QtyGroup = new Map()

  constructor(checked?: CheckedGroup, qty?: QtyGroup) {
    if (checked) this.checked = new Map(checked)
    if (qty) this.qty = new Map(qty)
  }

  toggleCheck(id: CartProductId) {
    const current = this.checked.get(id) ?? false
    this.checked.set(id, !current)
  }

  setQty(id: CartProductId, value: number) {
    this.qty.set(id, value)
  }

  getQty(id: CartProductId): number {
    return this.qty.get(id) ?? 1
  }

  isChecked(id: CartProductId): boolean {
    return this.checked.get(id) ?? false
  }

  toJSON() {
    return {
      checked: Array.from(this.checked.entries()),
      qty: Array.from(this.qty.entries()),
    }
  }

  static fromJSON(json: string) {
    const parsed = JSON.parse(json)
    const checked = new Map(parsed.checked) as CheckedGroup
    const qty = new Map(parsed.qty) as QtyGroup

    return new OrderManager(checked, qty)
  }
}
