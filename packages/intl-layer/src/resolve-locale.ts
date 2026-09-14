import type { LocaleInput, ResolveLocaleSources } from './intl-layer.types'

/** `"ko"` → `"ko-Kore-KR"`. likely subtags를 보강해 일관된 캐시 키/태그로 쓴다. */
export function maximizeLocale(input: LocaleInput): Intl.Locale {
  const locale = typeof input === 'string' ? new Intl.Locale(input) : input
  return locale.maximize()
}

/** `Accept-Language` 헤더를 q-값 내림차순 태그 배열로 파싱한다. */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2)
      const quality = q === undefined ? 1 : Number(q)
      return {
        tag: tag.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      }
    })
    .filter((e) => e.tag && e.tag !== '*')
    .sort((a, b) => b.quality - a.quality)
    .map((e) => e.tag)
}

function languageOf(tag: string): string {
  try {
    return new Intl.Locale(tag).language
  } catch {
    return ''
  }
}

/**
 * 후보가 실제 locale인지 확인해 정규화된 태그를 반환한다. 아니면 `null`.
 *
 * BCP 47 형식 검사(`Intl.getCanonicalLocales`)만으로는 `products` 같은 경로
 * 세그먼트도 통과하므로, 런타임에 locale 데이터가 있는지
 * (`Intl.DateTimeFormat.supportedLocalesOf`)까지 확인한다.
 */
function toKnownLocale(candidate: string): string | null {
  try {
    const [canonical] = Intl.getCanonicalLocales(candidate.trim())
    if (!canonical) return null
    return Intl.DateTimeFormat.supportedLocalesOf(canonical).length > 0
      ? canonical
      : null
  } catch {
    return null
  }
}

/**
 * 후보 목록을 supported와 협상한다. exact 매칭 우선, 없으면 language subtag 매칭.
 * 매칭이 없으면 null.
 */
function negotiate(candidates: string[], supported: string[]): string | null {
  for (const candidate of candidates) {
    const exact = supported.find(
      (s) => s.toLowerCase() === candidate.toLowerCase(),
    )
    if (exact) return exact
  }
  for (const candidate of candidates) {
    const lang = languageOf(candidate)
    if (!lang) continue
    const byLang = supported.find((s) => languageOf(s) === lang)
    if (byLang) return byLang
  }
  return null
}

/**
 * locale 결정의 단일 지점. 우선순위 `urlSegment > cookie > Accept-Language > fallback`.
 * `supported`를 주면 협상 후 매칭되는 태그만, 없으면 locale로 인정되는 첫 후보를 돌려준다.
 *
 * `supported`가 없을 때 후보는 `Intl.getCanonicalLocales`로 형식을 검사하고, 런타임이
 * 해당 locale 데이터를 가진 경우(`Intl.DateTimeFormat.supportedLocalesOf`)만 쓴다.
 * 그래서 `/products/…`의 `products` 같은 locale이 아닌 값은 건너뛰고, 통과한 후보는
 * 정규화된 태그(`en-us` → `en-US`)로 반환한다. 모두 탈락하면 `fallback`이다.
 *
 * @example
 * ```ts
 * import { resolveLocale } from '@cbcruk/intl-layer'
 *
 * resolveLocale({
 *   cookie: null,
 *   acceptLanguage: 'ko;q=0.9,en-US',
 *   supported: ['ko-KR', 'en-US'],
 * }) // 'en-US'
 * ```
 *
 * @example supported 없이 URL 세그먼트 검증
 * ```ts
 * import { resolveLocale } from '@cbcruk/intl-layer'
 *
 * resolveLocale({ urlSegment: 'products', acceptLanguage: 'ko-KR' }) // 'ko-KR'
 * ```
 */
export function resolveLocale(sources: ResolveLocaleSources): string {
  const {
    urlSegment,
    cookie,
    acceptLanguage,
    supported,
    fallback = 'en',
  } = sources
  const candidates = [
    urlSegment,
    cookie,
    ...(acceptLanguage ? parseAcceptLanguage(acceptLanguage) : []),
  ].filter((c): c is string => Boolean(c && c.trim()))

  if (supported && supported.length > 0) {
    return negotiate(candidates, supported) ?? fallback
  }
  for (const candidate of candidates) {
    const locale = toKnownLocale(candidate)
    if (locale) return locale
  }
  return fallback
}

/**
 * dev 빌드용 silent-fallback 탐지. 포매터가 실제로 해석한 locale의 language가
 * 기대 태그와 다르면 해석된 태그를 반환(로깅용), 일치하면 null.
 */
export function detectLocaleMismatch(
  formatter: { resolvedOptions(): { locale: string } },
  expectedTag: string,
): string | null {
  const resolved = formatter.resolvedOptions().locale
  return languageOf(resolved) === languageOf(expectedTag) ? null : resolved
}
