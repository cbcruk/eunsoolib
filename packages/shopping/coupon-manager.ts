export type Coupon = {}

export class CouponManager {
  private coupon: Coupon | null = null

  constructor(initialCoupon: Coupon | null = null) {
    this.coupon = initialCoupon
  }

  setCoupon(coupon: Coupon) {
    this.coupon = coupon
  }

  resetCoupon() {
    this.coupon = null
  }

  getCoupon(): Coupon | null {
    return this.coupon
  }

  toJSON(): string {
    return JSON.stringify(this.coupon)
  }

  static fromJSON(data: string): CouponManager {
    const parsed = data ? JSON.parse(data) : null

    return new CouponManager(parsed)
  }
}
