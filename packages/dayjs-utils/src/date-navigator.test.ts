import { describe, expect, it, test } from 'vitest'
import { DateNavigator } from './date-navigator'

test('DateNavigator', () => {
  const dateNavigator = new DateNavigator('2025-05-06')

  expect(dateNavigator.previous()).toMatchInlineSnapshot(`"2025-05-05"`)
  expect(dateNavigator.next()).toMatchInlineSnapshot(`"2025-05-06"`)
})

describe('DateNavigator 파싱', () => {
  // 이 파일은 time-range를 import하지 않으므로, 플러그인 등록이 다른 모듈에 의존하면 실패한다
  it('time-range를 import하지 않아도 커스텀 포맷으로 파싱해야 함', () => {
    const nav = new DateNavigator('06-05-2025', 'DD-MM-YYYY')

    expect(nav.get()).toBe('06-05-2025')
    expect(nav.next()).toBe('07-05-2025')
  })

  it('set()도 커스텀 포맷으로 파싱해야 함', () => {
    const nav = new DateNavigator('01.01.2025', 'DD.MM.YYYY')

    nav.set('31.12.2025')

    expect(nav.get()).toBe('31.12.2025')
    expect(nav.next()).toBe('01.01.2026')
  })

  it('포맷과 다른 형식의 날짜는 예외를 던져야 함', () => {
    expect(() => new DateNavigator('2025-5-6')).toThrow(/Invalid date string/)
    expect(() => new DateNavigator('not a date')).toThrow(/Invalid date string/)
  })

  it('존재하지 않는 날짜는 넘어가지 않고 예외를 던져야 함', () => {
    expect(() => new DateNavigator('2025-13-45')).toThrow(/Invalid date string/)
    expect(() => new DateNavigator('2025-02-30')).toThrow(/Invalid date string/)
  })

  it('set()에 잘못된 날짜를 넘기면 예외를 던지고 현재 날짜를 유지해야 함', () => {
    const nav = new DateNavigator('2025-05-06')

    expect(() => nav.set('2025/05/07')).toThrow(/Invalid date string/)
    expect(nav.get()).toBe('2025-05-06')
  })
})
