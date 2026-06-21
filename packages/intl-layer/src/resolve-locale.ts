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
 * `supported`를 주면 협상 후 매칭되는 태그만, 없으면 첫 후보를 그대로 돌려준다.
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
  return candidates[0] ?? fallback
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
