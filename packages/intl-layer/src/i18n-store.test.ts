import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nStore, createI18nStore, detectInitialLocale } from './i18n-store'

afterEach(() => {
  document.documentElement.removeAttribute('lang')
})

describe('I18nStore', () => {
  it('초기 locale을 maximize하고 tag로 노출해야 함', () => {
    const store = new I18nStore('ko-KR', 'Asia/Seoul')
    expect(store.tag).toBe('ko-Kore-KR')
    expect(store.locale.region).toBe('KR')
  })

  it('같은 옵션의 포매터는 memoize해 같은 인스턴스를 돌려줘야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    expect(store.date({ dateStyle: 'short' })).toBe(
      store.date({ dateStyle: 'short' }),
    )
  })

  it('옵션 키 순서가 달라도 같은 캐시 항목이어야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    expect(store.number({ style: 'currency', currency: 'USD' })).toBe(
      store.number({ currency: 'USD', style: 'currency' }),
    )
  })

  it('store의 timeZone을 date 포매터에 주입해야 함', () => {
    const store = new I18nStore('en-US', 'Asia/Seoul')
    expect(store.date().resolvedOptions().timeZone).toBe('Asia/Seoul')
  })

  it('setLocale은 캐시를 비우고 <html lang>을 동기화하며 change를 발생시켜야 함', () => {
    const store = new I18nStore('ko-KR', 'UTC')
    const before = store.number()
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.setLocale('en-US')

    expect(store.tag).toBe('en-Latn-US')
    expect(store.number()).not.toBe(before)
    expect(document.documentElement.lang).toBe('en-Latn-US')
    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toBeInstanceOf(Intl.Locale)
  })

  it('maximize 결과가 같은 locale로의 변경은 no-op이어야 함', () => {
    const store = new I18nStore('ko-KR', 'UTC')
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.setLocale('ko-Kore-KR')
    expect(listener).not.toHaveBeenCalled()
  })

  it('setTimeZone은 캐시를 비우고 change를 발생시켜야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const before = store.date()
    const listener = vi.fn()
    store.addEventListener('change', listener)

    store.setTimeZone('Asia/Seoul')
    expect(store.date()).not.toBe(before)
    expect(store.date().resolvedOptions().timeZone).toBe('Asia/Seoul')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('detectInitialLocale', () => {
  it('<html lang>을 가장 우선해야 함', () => {
    document.documentElement.lang = 'ko-KR'
    expect(detectInitialLocale()).toBe('ko-KR')
  })

  it('lang이 없으면 navigator.language로 떨어져야 함', () => {
    document.documentElement.removeAttribute('lang')
    expect(detectInitialLocale()).toBe(navigator.language)
  })
})

describe('createI18nStore', () => {
  it('명시한 locale/timeZone을 그대로 써야 함', () => {
    const store = createI18nStore({ locale: 'ja-JP', timeZone: 'Asia/Tokyo' })
    expect(store.locale.language).toBe('ja')
    expect(store.timeZone).toBe('Asia/Tokyo')
  })
})
