import {
  createI18nStore,
  resolveLocale,
  applyI18n,
  bindI18nSweep,
} from './index'

/**
 * Vanilla 진입점 예시: locale을 한 곳에서 결정하고, store를 만들고, DOM sweep을 묶는다.
 * consumer는 `Intl.*`를 직접 만지지 않고 store 메소드만 거친다.
 */
export function bootstrapI18n(): void {
  const locale = resolveLocale({
    urlSegment: location.pathname.split('/')[1] || null,
    cookie: document.cookie.match(/locale=([^;]+)/)?.[1] ?? null,
    acceptLanguage: navigator.language,
    supported: ['ko-KR', 'en-US', 'ja-JP'],
    fallback: 'en-US',
  })

  const store = createI18nStore({ locale })

  applyI18n(store)
  bindI18nSweep(store)

  // 다른 탭과의 동기화는 storage 이벤트로 거의 공짜.
  window.addEventListener('storage', (e) => {
    if (e.key === 'locale' && e.newValue) store.setLocale(e.newValue)
  })

  // 예: 언어 토글
  document.querySelector('#to-korean')?.addEventListener('click', () => {
    localStorage.setItem('locale', 'ko-KR')
    store.setLocale('ko-KR')
  })
}
