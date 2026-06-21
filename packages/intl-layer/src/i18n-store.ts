import { maximizeLocale } from './resolve-locale'
import { stableStringify } from './stable-stringify'
import type { I18nStoreOptions } from './intl-layer.types'

/**
 * 의존성 없는 reactive locale store. `EventTarget`을 상속해 `change` 이벤트로
 * 구독을 제공하고, 포매터는 locale/timeZone 단위로 memoize한다. locale이 바뀌면
 * 캐시 전체를 무효화하고 `<html lang>`을 canonical source로 동기화한다.
 */
export class I18nStore extends EventTarget {
  #locale: Intl.Locale
  #timeZone: string
  #cache = new Map<string, unknown>()

  constructor(initialLocale: string, initialTimeZone: string) {
    super()
    this.#locale = maximizeLocale(initialLocale)
    this.#timeZone = initialTimeZone
  }

  get locale(): Intl.Locale {
    return this.#locale
  }

  /** maximize된 BCP 47 태그. 캐시 키이자 포매터 locale 인자. */
  get tag(): string {
    return this.#locale.toString()
  }

  get timeZone(): string {
    return this.#timeZone
  }

  setLocale(tag: string): void {
    const next = maximizeLocale(tag)
    if (next.toString() === this.#locale.toString()) return
    this.#locale = next
    this.#cache.clear()
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next.toString()
    }
    this.dispatchEvent(new CustomEvent('change', { detail: next }))
  }

  setTimeZone(timeZone: string): void {
    if (timeZone === this.#timeZone) return
    this.#timeZone = timeZone
    this.#cache.clear()
    this.dispatchEvent(new CustomEvent('change', { detail: this.#locale }))
  }

  date(opts: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
    return this.#memo(
      'date',
      opts,
      () =>
        new Intl.DateTimeFormat(this.tag, {
          timeZone: this.#timeZone,
          ...opts,
        }),
    )
  }

  number(opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
    return this.#memo(
      'number',
      opts,
      () => new Intl.NumberFormat(this.tag, opts),
    )
  }

  relativeTime(
    opts: Intl.RelativeTimeFormatOptions = {},
  ): Intl.RelativeTimeFormat {
    return this.#memo(
      'rtf',
      opts,
      () => new Intl.RelativeTimeFormat(this.tag, opts),
    )
  }

  /** 테스트/수동 무효화용. */
  clearCache(): void {
    this.#cache.clear()
  }

  #memo<T>(kind: string, opts: object, create: () => T): T {
    const key = `${kind}:${stableStringify(opts)}`
    let formatter = this.#cache.get(key) as T | undefined
    if (formatter === undefined) {
      formatter = create()
      this.#cache.set(key, formatter)
    }
    return formatter
  }
}

/** SSR-safe 초기 locale 탐지: `<html lang>` → `navigator.language` → fallback. */
export function detectInitialLocale(fallback = 'en'): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return fallback
}

/** 런타임이 해석한 timeZone. 실패 시 fallback. */
export function detectTimeZone(fallback = 'UTC'): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
  } catch {
    return fallback
  }
}

/**
 * store 생성 헬퍼. locale/timeZone을 명시하면 그대로, 생략하면 명시적 탐지
 * 헬퍼를 통해 채운다 — 환경 의존을 이 한 지점으로 모은다.
 */
export function createI18nStore(
  options: Partial<I18nStoreOptions> = {},
): I18nStore {
  return new I18nStore(
    options.locale ?? detectInitialLocale(),
    options.timeZone ?? detectTimeZone(),
  )
}
