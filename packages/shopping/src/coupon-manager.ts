/** 적용 가능한 쿠폰 */
export type Coupon = {}

/**
 * 주문에 적용된 쿠폰 하나를 보관하는 매니저
 *
 * 한 번에 하나의 쿠폰만 적용할 수 있으며, `setCoupon`은 기존 쿠폰을 교체한다.
 *
 * @example
 * ```ts
 * import { CouponManager, type Coupon } from '@cbcruk/shopping'
 *
 * const coupon: Coupon = {}
 * const manager = new CouponManager()
 * manager.setCoupon(coupon)
 * manager.getCoupon() // coupon
 *
 * const restored = CouponManager.fromJSON(JSON.stringify(manager))
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

  /**
   * 직렬화 가능한 쿠폰 값으로 변환
   *
   * 다른 매니저와 같이 문자열이 아닌 값을 반환하므로 `JSON.stringify(manager)`로 한 번만 인코딩된다.
   *
   * @returns 적용된 쿠폰. 없으면 `null`
   */
  toJSON(): Coupon | null {
    return this.coupon
  }

  /**
   * {@link CouponManager.toJSON} 결과 문자열로부터 복원
   *
   * @param data - `JSON.stringify(manager)` 결과. 빈 문자열이면 미적용 상태로 복원된다
   */
  static fromJSON(data: string): CouponManager {
    const parsed = data ? JSON.parse(data) : null

    return new CouponManager(parsed)
  }
}
