import type { I18nStore } from './i18n-store'

/**
 * 패턴 A — data attribute + 단일 sweep. SSR이 채운 텍스트를 클라이언트가 덮어쓰는
 * 구조라 mismatch가 self-heal된다. `[data-fmt-date]` / `[data-fmt-number]`를 훑어
 * store 포매터로 textContent를 갱신한다.
 */
export function applyI18n(store: I18nStore, root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-fmt-date]')) {
    const value = el.dataset.fmtDate
    if (!value) continue
    const style = (el.dataset.fmtDateStyle ??
      'medium') as Intl.DateTimeFormatOptions['dateStyle']
    el.textContent = store.date({ dateStyle: style }).format(new Date(value))
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-fmt-number]')) {
    const value = el.dataset.fmtNumber
    if (!value) continue
    el.textContent = store.number().format(Number(value))
  }
}

/**
 * change 이벤트마다 자동 재적용되도록 store를 sweep에 연결한다. 해제 함수를 반환한다.
 */
export function bindI18nSweep(
  store: I18nStore,
  root: ParentNode = document,
): () => void {
  const sweep = (): void => applyI18n(store, root)
  store.addEventListener('change', sweep)
  return () => store.removeEventListener('change', sweep)
}

/**
 * 패턴 B — Custom Element. lifecycle에서 listener cleanup이 자연스럽게 들어가
 * 메모리 누수를 방지한다. `<fmt-date value="..." style-as="long">`.
 */
export function defineFormattedDate(
  store: I18nStore,
  tagName = 'fmt-date',
): void {
  if (typeof customElements === 'undefined' || customElements.get(tagName))
    return

  class FormattedDate extends HTMLElement {
    static observedAttributes = ['value', 'style-as']
    #onChange = (): void => this.#render()

    connectedCallback(): void {
      this.#render()
      store.addEventListener('change', this.#onChange)
    }

    disconnectedCallback(): void {
      store.removeEventListener('change', this.#onChange)
    }

    attributeChangedCallback(): void {
      this.#render()
    }

    #render(): void {
      const value = this.getAttribute('value')
      if (!value) return
      const style = (this.getAttribute('style-as') ??
        'medium') as Intl.DateTimeFormatOptions['dateStyle']
      this.textContent = store
        .date({ dateStyle: style })
        .format(new Date(value))
    }
  }

  customElements.define(tagName, FormattedDate)
}
