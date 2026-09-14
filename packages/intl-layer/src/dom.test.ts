import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nStore } from './i18n-store'
import { applyI18n, bindI18nSweep, defineFormattedDate } from './dom'

let container: HTMLDivElement | null = null

function mount(html: string): HTMLDivElement {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  container?.remove()
  container = null
  vi.unstubAllGlobals()
})

describe('applyI18n', () => {
  it('[data-fmt-date]를 store 포매터로 채워야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount(
      '<span data-fmt-date="2026-01-15" data-fmt-date-style="medium"></span>',
    )

    applyI18n(store, root)

    const text = root.querySelector('span')!.textContent ?? ''
    expect(text).toContain('2026')
    expect(text).toContain('Jan')
  })

  it('[data-fmt-number]를 천 단위로 포맷해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount('<b data-fmt-number="1234.5"></b>')

    applyI18n(store, root)
    expect(root.querySelector('b')!.textContent).toBe('1,234.5')
  })

  it('값이 없는 요소는 건드리지 않아야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount('<span data-fmt-date=""></span>')
    applyI18n(store, root)
    expect(root.querySelector('span')!.textContent).toBe('')
  })

  it('날짜로 해석되지 않는 값은 원문을 유지하고 나머지 요소는 계속 갱신해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount(`
      <span id="bad" data-fmt-date="not-a-date">SSR 원문</span>
      <span id="good" data-fmt-date="2026-01-15"></span>
      <b data-fmt-number="1234.5"></b>
    `)

    expect(() => applyI18n(store, root)).not.toThrow()

    expect(root.querySelector('#bad')!.textContent).toBe('SSR 원문')
    expect(root.querySelector('#good')!.textContent).toContain('2026')
    expect(root.querySelector('b')!.textContent).toBe('1,234.5')
  })

  it('숫자로 해석되지 않는 값은 NaN으로 덮어쓰지 않고 원문을 유지해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount('<b data-fmt-number="abc">원문</b>')

    applyI18n(store, root)

    expect(root.querySelector('b')!.textContent).toBe('원문')
  })

  it('요소 하나의 포맷 예외는 보고하고 sweep을 멈추지 않아야 함', () => {
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    const store = new I18nStore('en-US', 'UTC')
    const root = mount(`
      <span id="bad" data-fmt-date="2026-01-15" data-fmt-date-style="nope">원문</span>
      <b data-fmt-number="1234.5"></b>
    `)

    applyI18n(store, root)

    expect(reportError).toHaveBeenCalledOnce()
    expect(reportError.mock.calls[0]![0]).toBeInstanceOf(RangeError)
    expect(root.querySelector('#bad')!.textContent).toBe('원문')
    expect(root.querySelector('b')!.textContent).toBe('1,234.5')
  })
})

describe('bindI18nSweep', () => {
  it('change 때 재적용하고 unbind 후에는 멈춰야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount('<b data-fmt-number="1234.5"></b>')
    const el = root.querySelector('b')!

    const unbind = bindI18nSweep(store, root)
    store.setLocale('de-DE')
    expect(el.textContent).toBe('1.234,5')

    unbind()
    store.setLocale('en-US')
    expect(el.textContent).toBe('1.234,5')
  })

  it('잘못된 날짜 값이 있어도 change 때 뒤따르는 요소를 갱신해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    const root = mount(
      '<span data-fmt-date="invalid">원문</span><b data-fmt-number="1234.5"></b>',
    )
    const el = root.querySelector('b')!

    const unbind = bindI18nSweep(store, root)
    store.setLocale('de-DE')

    expect(el.textContent).toBe('1.234,5')
    expect(root.querySelector('span')!.textContent).toBe('원문')
    unbind()
  })
})

describe('defineFormattedDate', () => {
  it('custom element가 store 포매터로 렌더해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    defineFormattedDate(store)

    const el = document.createElement('fmt-date')
    el.setAttribute('value', '2026-01-15')
    el.setAttribute('style-as', 'medium')
    document.body.appendChild(el)

    expect(el.textContent).toContain('2026')
    el.remove()
  })

  it('value가 날짜로 해석되지 않으면 예외 없이 기존 텍스트를 유지해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')
    defineFormattedDate(store)

    const onError = vi.fn((event: Event) => event.preventDefault())
    window.addEventListener('error', onError)
    const el = document.createElement('fmt-date')
    el.textContent = '원문'
    el.setAttribute('value', 'not-a-date')

    document.body.appendChild(el)
    window.removeEventListener('error', onError)

    expect(onError).not.toHaveBeenCalled()
    expect(el.textContent).toBe('원문')
    el.remove()
  })
})
