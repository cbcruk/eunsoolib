/** 적용 가능한 쿠폰 */
export type Coupon = {}

/**
 * 주문에 적용된 쿠폰 하나를 보관하는 매니저
 *
 * 한 번에 하나의 쿠폰만 적용할 수 있으며, `setCoupon`은 기존 쿠폰을 교체한다.
 *
 * @example
 * ```ts
 * const manager = new CouponManager()
 * manager.setCoupon(coupon)
 * manager.getCoupon() // coupon
 * manager.resetCoupon()
 * ```
 */
export class CouponManager {
  private coupon: Coupon | null = null

  /**
   * @param initialCoupon - 초기 적용 쿠폰. 기본값은 미적용(`null`)
   */
  constructor(initialCoupon: Coupon | null = null) {
    this.coupon = initialCoupon
  }

  /**
   * 쿠폰을 적용한다. 이미 적용된 쿠폰이 있으면 교체된다
   *
   * @param coupon - 적용할 쿠폰
   */
  setCoupon(coupon: Coupon) {
    this.coupon = coupon
  }

  /** 적용된 쿠폰을 해제 */
  resetCoupon() {
    this.coupon = null
  }

  /** 적용된 쿠폰을 반환. 없으면 `null` */
  getCoupon(): Coupon | null {
    return this.coupon
  }

  /** 적용된 쿠폰을 JSON 문자열로 직렬화 */
  toJSON(): string {
    return JSON.stringify(this.coupon)
  }

  /**
   * {@link CouponManager.toJSON} 결과로부터 복원
   *
   * @param data - 직렬화된 쿠폰 문자열. 빈 문자열이면 미적용 상태로 복원된다
   */
  static fromJSON(data: string): CouponManager {
    const parsed = data ? JSON.parse(data) : null

    return new CouponManager(parsed)
  }
}
