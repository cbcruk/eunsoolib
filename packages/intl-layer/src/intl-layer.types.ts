export type LocaleInput = string | Intl.Locale

export interface I18nStoreOptions {
  locale: string
  timeZone: string
}

/** locale 결정 입력. 우선순위: urlSegment > cookie > acceptLanguage > fallback. */
export interface ResolveLocaleSources {
  urlSegment?: string | null
  cookie?: string | null
  /** `navigator.language` 또는 `Accept-Language` 헤더 값. */
  acceptLanguage?: string | null
  /** 허용 locale 목록. 주면 협상(negotiation) 후 매칭되는 것만 반환. */
  supported?: string[]
  /** 아무것도 매칭되지 않을 때의 최종 fallback. 기본 'en'. */
  fallback?: string
}

/** React `useFormatters`가 돌려주는 메모이즈된 포매터 묶음. */
export interface Formatters {
  date: Intl.DateTimeFormat
  number: Intl.NumberFormat
  relativeTime: Intl.RelativeTimeFormat
  currency: (currency: string) => Intl.NumberFormat
}
