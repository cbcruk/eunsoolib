import { describe, expect, it } from 'vitest'
import {
  detectLocaleMismatch,
  maximizeLocale,
  parseAcceptLanguage,
  resolveLocale,
} from './resolve-locale'

describe('maximizeLocale', () => {
  it('불완전한 태그에 likely subtags를 보강해야 함', () => {
    const locale = maximizeLocale('ko')
    expect(locale.language).toBe('ko')
    expect(locale.region).toBe('KR')
    expect(locale.script).toBe('Kore')
  })

  it('Intl.Locale 인스턴스도 받아야 함', () => {
    expect(maximizeLocale(new Intl.Locale('en')).region).toBe('US')
  })
})

describe('parseAcceptLanguage', () => {
  it('q-값 내림차순으로 태그를 정렬해야 함', () => {
    expect(parseAcceptLanguage('en;q=0.5,ko;q=0.9,ja;q=0.8')).toEqual([
      'ko',
      'ja',
      'en',
    ])
  })

  it('q가 없으면 1로 보고 순서를 유지해야 함', () => {
    expect(parseAcceptLanguage('ko-KR,ko;q=0.9,en;q=0.8')).toEqual([
      'ko-KR',
      'ko',
      'en',
    ])
  })

  it('와일드카드는 무시해야 함', () => {
    expect(parseAcceptLanguage('ko,*;q=0.1')).toEqual(['ko'])
  })
})

describe('resolveLocale', () => {
  it('urlSegment가 가장 우선해야 함', () => {
    expect(
      resolveLocale({
        urlSegment: 'ja-JP',
        cookie: 'ko-KR',
        acceptLanguage: 'en-US',
      }),
    ).toBe('ja-JP')
  })

  it('urlSegment가 없으면 cookie를 써야 함', () => {
    expect(resolveLocale({ cookie: 'ko-KR', acceptLanguage: 'en-US' })).toBe(
      'ko-KR',
    )
  })

  it('Accept-Language의 최우선 태그로 떨어져야 함', () => {
    expect(resolveLocale({ acceptLanguage: 'en;q=0.5,ko;q=0.9' })).toBe('ko')
  })

  it('아무 후보도 없으면 fallback이어야 함', () => {
    expect(resolveLocale({ fallback: 'en-US' })).toBe('en-US')
    expect(resolveLocale({})).toBe('en')
  })

  it('supported에 없으면 language subtag로 협상해야 함', () => {
    expect(
      resolveLocale({
        acceptLanguage: 'ko',
        supported: ['ko-KR', 'en-US'],
      }),
    ).toBe('ko-KR')
  })

  it('supported와 전혀 맞지 않으면 fallback이어야 함', () => {
    expect(
      resolveLocale({
        urlSegment: 'fr-FR',
        supported: ['ko-KR', 'en-US'],
        fallback: 'en-US',
      }),
    ).toBe('en-US')
  })

  it('exact 매칭은 대소문자를 무시해야 함', () => {
    expect(resolveLocale({ cookie: 'EN-us', supported: ['en-US'] })).toBe(
      'en-US',
    )
  })
})

describe('detectLocaleMismatch', () => {
  it('해석된 language가 기대와 다르면 해석값을 반환해야 함', () => {
    const formatter = { resolvedOptions: () => ({ locale: 'en-US' }) }
    expect(detectLocaleMismatch(formatter, 'ko-KR')).toBe('en-US')
  })

  it('language가 일치하면 null이어야 함', () => {
    const formatter = { resolvedOptions: () => ({ locale: 'ko' }) }
    expect(detectLocaleMismatch(formatter, 'ko-Kore-KR')).toBeNull()
  })
})
