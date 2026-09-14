/** locale 입력. BCP 47 태그 문자열 또는 `Intl.Locale`. */
export type LocaleInput = string | Intl.Locale

/** {@link createI18nStore}에 넘기는 store 초기값. */
export interface I18nStoreOptions {
  /** 초기 locale 태그. `createI18nStore`에서 생략하면 `detectInitialLocale()` 결과를 쓴다. */
  locale: string
  /** 초기 IANA timeZone. `createI18nStore`에서 생략하면 `detectTimeZone()` 결과를 쓴다. */
  timeZone: string
}

/** locale 결정 입력. 우선순위: urlSegment > cookie > acceptLanguage > fallback. */
export interface ResolveLocaleSources {
  /** URL 경로에서 꺼낸 locale segment. 가장 우선한다. */
  urlSegment?: string | null
  /** 쿠키에 저장된 locale. */
  cookie?: string | null
  /** `navigator.language` 또는 `Accept-Language` 헤더 값. */
  acceptLanguage?: string | null
  /** 허용 locale 목록. 주면 협상(negotiation) 후 매칭되는 것만 반환, 없으면 locale로 검증된 첫 후보를 반환. */
  supported?: string[]
  /** 아무것도 매칭되지 않을 때의 최종 fallback. 검증 없이 그대로 반환한다. @default 'en' */
  fallback?: string
}

/** React `useFormatters`가 돌려주는 메모이즈된 포매터 묶음. */
export interface Formatters {
  /** `dateStyle: 'medium'` 날짜 포매터 */
  date: Intl.DateTimeFormat
  /** 기본 옵션 숫자 포매터 */
  number: Intl.NumberFormat
  /** `numeric: 'auto'` 상대 시간 포매터 */
  relativeTime: Intl.RelativeTimeFormat
  /** 통화 코드(예: `'KRW'`)를 받아 호출할 때마다 새 통화 포매터를 만든다. */
  currency: (currency: string) => Intl.NumberFormat
}
