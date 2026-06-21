# @eunsoolib/intl-layer

브라우저 `Intl` API를 안전하게 쓰기 위한 **locale layer**. React / vanilla 양쪽을
지원하며, "암묵적 환경 의존"을 제거하고 locale 결정 지점을 한 곳으로 모은다.

## 왜

`Intl.*` 생성자의 `locales` 인자는 optional이라, 안 넘기면 런타임의 default locale을
silent하게 쓴다. 이게 실무에선 함정이다.

- **SSR/CSR 불일치**: 서버 Node default(`en-US`)와 클라이언트 `navigator.language`
  (`ko-KR`)가 달라 hydration mismatch + flash.
- **OS locale ≠ 선호 locale**: 한국 거주자가 영어 UI를 원하면 OS는 `ko-KR`이지만 앱은 `en`.
- **silent fallback**: 미지원 locale도 에러 없이 가까운 것으로 fallback → 버그 늦게 발견.
- **우회 경로**: `toLocaleString()`은 Intl 인스턴스도 안 만들고 default로 포맷 → layer 우회.

**계약**: 이 라이브러리는 default locale을 절대 쓰지 않고 locale을 반드시 인자로 받는다.
환경 의존은 단일 결정 지점(`resolveLocale` / `detect*`)에만 둔다.

## 설치

```bash
pnpm add @eunsoolib/intl-layer
# React 바인딩을 쓸 때만:
pnpm add react
```

## locale 결정 (단일 지점)

우선순위 `urlSegment > cookie > Accept-Language > fallback`. `supported`를 주면
language subtag까지 협상한다.

```ts
import { resolveLocale } from '@eunsoolib/intl-layer'

const locale = resolveLocale({
  urlSegment: 'ko', // /ko/dashboard 의 첫 세그먼트
  cookie: null,
  acceptLanguage: navigator.language, // 또는 Accept-Language 헤더
  supported: ['ko-KR', 'en-US', 'ja-JP'],
  fallback: 'en-US',
})
// → 'ko-KR'  (language 협상)
```

## Vanilla — `I18nStore`

의존성 없는 reactive store. `EventTarget` 기반 `change` 이벤트, 포매터 memoize,
locale 변경 시 캐시 무효화 + `<html lang>` 동기화.

```ts
import {
  createI18nStore,
  applyI18n,
  bindI18nSweep,
} from '@eunsoolib/intl-layer'

const store = createI18nStore({ locale: 'ko-KR', timeZone: 'Asia/Seoul' })

store.date({ dateStyle: 'medium' }).format(new Date())
store.number({ style: 'currency', currency: 'KRW' }).format(12000)

// data attribute sweep (패턴 A) — SSR이 채운 텍스트를 클라이언트가 self-heal
applyI18n(store)
bindI18nSweep(store) // change마다 자동 재적용, 해제 함수 반환

store.setLocale('en-US') // 캐시 비움 + <html lang> 갱신 + change 발생
```

Custom Element (패턴 B):

```ts
import { defineFormattedDate } from '@eunsoolib/intl-layer'

defineFormattedDate(store) // <fmt-date value="2026-01-15" style-as="long">
```

## React — Context + memoize

```tsx
import { LocaleProvider, useFormatters } from '@eunsoolib/intl-layer'

// 서버에서 결정한 locale 주입 (Next.js App Router라면 [locale] segment → RootLayout)
;<LocaleProvider locale={resolveLocale(/* ... */)}>
  <App />
</LocaleProvider>

function Price({ value }: { value: number }) {
  const { currency } = useFormatters()
  return <span>{currency('KRW').format(value)}</span>
}
```

vanilla store를 React에 잇고 싶다면:

```tsx
import { useI18nStore } from '@eunsoolib/intl-layer'

const locale = useI18nStore(store) // change에 반응해 리렌더
```

## API

| 항목                                             | 설명                                                      |
| ------------------------------------------------ | --------------------------------------------------------- |
| `resolveLocale(sources)`                         | locale 결정 단일 지점 (우선순위 + supported 협상)         |
| `maximizeLocale(input)`                          | `"ko"` → `"ko-Kore-KR"` (likely subtags 보강)             |
| `parseAcceptLanguage(header)`                    | q-값 내림차순 태그 배열                                   |
| `detectLocaleMismatch(fmt, expected)`            | dev용 silent-fallback 탐지 (불일치 시 해석된 태그)        |
| `I18nStore` / `createI18nStore`                  | vanilla reactive store (date/number/relativeTime memoize) |
| `detectInitialLocale` / `detectTimeZone`         | 명시적 환경 탐지 헬퍼                                     |
| `applyI18n` / `bindI18nSweep`                    | data attribute sweep (패턴 A)                             |
| `defineFormattedDate`                            | `<fmt-date>` custom element (패턴 B)                      |
| `LocaleProvider` / `useLocale` / `useFormatters` | React context 바인딩                                      |
| `useI18nStore(store)`                            | vanilla store ↔ React 연결                                |
| `stableStringify(opts)`                          | 키 순서 무관 캐시 키 직렬화                               |

## Gotchas

- **memo 키 옵션 순서.** `JSON.stringify`는 키 순서에 민감 → `stableStringify`로 정규화.
  (React `useMemo`는 reference equality라 무관, vanilla 캐시는 직접 처리.)
- **silent fallback 조기 탐지.** dev에서 `detectLocaleMismatch`로 expected와 비교해 로깅.
- **`Intl`은 formatting이지 계산이 아니다.** 상대 시간은 차이를 직접 계산해
  `relativeTime`에 넘긴다. 단위 변환(°C, miles)은 하지 않는다.
- **multi-tab 동기화는 `storage` 이벤트로 거의 공짜.** 한 탭에서
  `localStorage.setItem('locale', tag)`, 다른 탭에서 `storage` → `store.setLocale`.

## 컨벤션 / 가드레일

- consumer 코드에서 `toLocaleString` / `new Intl.*` 직접 호출 금지
  (ESLint `no-restricted-syntax` / `no-restricted-properties`로 PR 단계 차단).
- 모든 포맷은 store 메소드 또는 라이브러리 API를 거친다.
- public API는 locale을 필수 인자로 받는다(default 없음).
