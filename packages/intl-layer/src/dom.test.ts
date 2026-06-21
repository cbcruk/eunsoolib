import { afterEach, describe, expect, it } from 'vitest'
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
})
