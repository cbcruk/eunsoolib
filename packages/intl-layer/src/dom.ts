import type { I18nStore } from './i18n-store'

type DateStyle = Intl.DateTimeFormatOptions['dateStyle']

/** 날짜 값을 포맷한다. `Date`로 해석되지 않으면 `null`을 반환한다. */
function formatDate(
  store: I18nStore,
  value: string,
  style: DateStyle,
): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return store.date({ dateStyle: style }).format(date)
}

/** 요소 하나를 갱신하다 난 예외를 sweep을 멈추지 않고 보고한다. */
function reportElementError(error: unknown): void {
  if (typeof reportError === 'function') reportError(error)
  else console.error(error)
}

/**
 * 패턴 A — data attribute + 단일 sweep. SSR이 채운 텍스트를 클라이언트가 덮어쓰는
 * 구조라 mismatch가 self-heal된다. `[data-fmt-date]` / `[data-fmt-number]`를 훑어
 * store 포매터로 textContent를 갱신한다.
 *
 * 값이 없거나 날짜·숫자로 해석되지 않는 요소는 건드리지 않아 원래 텍스트가 남는다.
 * 요소 하나에서 난 예외(예: 잘못된 `data-fmt-date-style`)는 `reportError`(없으면
 * `console.error`)로 보고하고 나머지 요소는 계속 갱신한다.
 */
export function applyI18n(store: I18nStore, root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-fmt-date]')) {
    const value = el.dataset.fmtDate
    if (!value) continue
    const style = (el.dataset.fmtDateStyle ?? 'medium') as DateStyle
    try {
      const text = formatDate(store, value, style)
      if (text !== null) el.textContent = text
    } catch (error) {
      reportElementError(error)
    }
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-fmt-number]')) {
    const value = el.dataset.fmtNumber
    if (!value) continue
    const number = Number(value)
    if (Number.isNaN(number)) continue
    try {
      el.textContent = store.number().format(number)
    } catch (error) {
      reportElementError(error)
    }
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
 *
 * `value`가 날짜로 해석되지 않으면 기존 텍스트를 그대로 둔다.
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
      const style = (this.getAttribute('style-as') ?? 'medium') as DateStyle
      try {
        const text = formatDate(store, value, style)
        if (text !== null) this.textContent = text
      } catch (error) {
        reportElementError(error)
      }
    }
  }

  customElements.define(tagName, FormattedDate)
}
