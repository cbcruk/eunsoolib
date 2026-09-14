import { describe, it, expect, beforeEach } from 'vitest'
import { CouponManager, type Coupon } from './coupon-manager'

describe('CouponManager', () => {
  let manager: CouponManager

  const sampleCoupon: Coupon = {
    id: 'c1',
    code: 'DISCOUNT10',
    discount: 10,
  }

  beforeEach(() => {
    manager = new CouponManager()
  })

  it('초기 상태는 null이어야 한다', () => {
    expect(manager.getCoupon()).toBeNull()
  })

  it('쿠폰을 설정할 수 있다', () => {
    manager.setCoupon(sampleCoupon)

    expect(manager.getCoupon()).toEqual(sampleCoupon)
  })

  it('쿠폰을 초기화할 수 있다', () => {
    manager.setCoupon(sampleCoupon)
    manager.resetCoupon()

    expect(manager.getCoupon()).toBeNull()
  })

  it('직렬화/역직렬화가 동작해야 한다', () => {
    manager.setCoupon(sampleCoupon)

    const json = JSON.stringify(manager)
    const restored = CouponManager.fromJSON(json)

    expect(restored.getCoupon()).toEqual(sampleCoupon)
  })

  it('toJSON은 문자열이 아닌 쿠폰 값을 반환해 한 번만 인코딩된다', () => {
    manager.setCoupon(sampleCoupon)

    expect(manager.toJSON()).toEqual(sampleCoupon)
    expect(JSON.parse(JSON.stringify(manager))).toEqual(sampleCoupon)
  })

  it('쿠폰이 없으면 null로 직렬화되고 미적용 상태로 복원된다', () => {
    const restored = CouponManager.fromJSON(JSON.stringify(manager))

    expect(manager.toJSON()).toBeNull()
    expect(restored.getCoupon()).toBeNull()
  })

  it('빈 문자열이면 미적용 상태로 복원된다', () => {
    expect(CouponManager.fromJSON('').getCoupon()).toBeNull()
  })
})
