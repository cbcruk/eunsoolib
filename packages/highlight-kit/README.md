# 🎨 @eunsoolib/highlight-kit

CSS Custom Highlight API 기반 텍스트 하이라이팅 라이브러리. DOM을 건드리지 않고
텍스트를 하이라이트합니다. 프레임워크 무관 core와 얇은 React 어댑터를 제공합니다.

## 설치

```bash
pnpm add @eunsoolib/highlight-kit
```

ESM 전용 패키지이며 타입 정의가 함께 포함됩니다. React 어댑터(`@eunsoolib/highlight-kit/react`)는
`react >= 18`을 필요로 하지만 **optional peer dependency**라, core만 쓰면 React 없이 동작합니다.

## Core (프레임워크 무관)

```typescript
import {
  highlights,
  computeRanges,
  injectHighlightStyles,
} from '@eunsoolib/highlight-kit'

injectHighlightStyles({
  search: { backgroundColor: '#fef08a', color: '#854d0e' },
})

const el = document.querySelector('#article')!
const ranges = computeRanges(el, 'wisdom', { caseSensitive: false })

// (name, sourceId, ranges) — 같은 name에 여러 source가 union 됨
highlights.set('search', 'my-source', ranges)

highlights.remove('search', 'my-source') // 한 source만 제거
highlights.clear('search') // name 통째로 제거
```

핵심: `set/remove/clear`는 name별로 여러 **source**의 기여를 합쳐 단일 `Highlight`로
reconcile합니다. 서로 다른 패널 두 곳에서 `'error'` 이름으로 하이라이트해도, CSS는
`::highlight(error)` 규칙 하나로 둘 다 스타일링됩니다.

## React

### 선언적 컴포넌트

```tsx
import { Highlight } from '@eunsoolib/highlight-kit/react'

function Article({ keyword }: { keyword: string }) {
  return (
    <Highlight query={keyword} name="search">
      <article>{/* ...긴 본문... */}</article>
    </Highlight>
  )
}
```

```css
::highlight(search) {
  background: #fef08a;
  color: #854d0e;
}
```

`as` prop으로 wrapper 태그 변경, 레이아웃 영향을 없애려면 `display: contents`:

```tsx
<Highlight query={q} name="search" as="section" style={{ display: 'contents' }}>
  {children}
</Highlight>
```

### Headless 훅

```tsx
import { useHighlight } from '@eunsoolib/highlight-kit/react'

function SearchableText({ query }: { query: string }) {
  const { ref, count, active } = useHighlight<HTMLDivElement>({
    query,
    name: 'search',
    caseSensitive: false,
  })

  return (
    <>
      <span>{count}개 일치</span>
      <div ref={ref}>{/* ...본문... */}</div>
    </>
  )
}
```

`name`을 생략하면 `useId` 기반 고유 이름이 자동 생성됩니다(인스턴스별 격리).

### 상태만 구독 / 지원 여부

```tsx
import {
  useHighlightState,
  useHighlightSupport,
} from '@eunsoolib/highlight-kit/react'

const { count, active } = useHighlightState('search') // 읽기 전용 구독
const supported = useHighlightSupport() // SSR 중엔 false
```

## API

### core

| export                                | 설명                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `highlights`                          | singleton 컨트롤러 (`set` / `remove` / `clear` / `clearAll` / `subscribe` / `getSnapshot`) |
| `computeRanges(root, pattern, opts?)` | 패턴(string/RegExp) 매칭 → `Range[]` (`caseSensitive` / `wholeWord` 옵션)                  |
| `rangesFromOffsets(root, spans)`      | 문자 offset 배열 → `Range[]`                                                               |
| `getTextNodes(root)`                  | 하위 텍스트 노드 수집                                                                      |
| `isHighlightSupported()`              | API 지원 여부                                                                              |
| `generateHighlightCSS(styles)`        | `::highlight()` CSS 문자열 생성 (주입 없이 반환)                                           |
| `injectHighlightStyles(styles, id?)`  | `::highlight()` CSS 동적 주입 (`<style>` 삽입)                                             |

### react (`@eunsoolib/highlight-kit/react`)

| export                      | 설명                                             |
| --------------------------- | ------------------------------------------------ |
| `useHighlight(opts)`        | headless. `ref` + `{ count, active, name }` 반환 |
| `useHighlightState(name)`   | name의 `{ count, active }` 읽기 전용 구독        |
| `useHighlightSupport()`     | 지원 여부 (SSR-safe)                             |
| `<Highlight query name as>` | 선언적 wrapper                                   |

타입도 함께 export됩니다: `MatchOptions`, `HighlightSnapshot`, `HighlightController`,
`UseHighlightOptions`, `UseHighlightResult`, `HighlightProps`.

## 설계 노트 / 한계

- **DOM 변경 비반응**: 컨테이너의 *텍스트 자체*가 바뀌면 자동 재계산되지 않습니다
  (`query`/`name`/옵션 변경 시에만 재실행). 동적 콘텐츠엔 `MutationObserver`로
  `useHighlight`를 재트리거하는 래퍼를 직접 구성하세요. Range는 DOM 변형 시
  stale 될 수 있습니다.
- **SSR**: `getServerSnapshot`이 항상 빈 스냅샷을 반환하고, 등록은 layout effect에서
  일어나므로 hydration 불일치가 없습니다.
- **`::highlight()` 지원 속성**: `color`, `background-color`, `text-decoration`(브라우저
  차이 있음), `text-shadow`, `-webkit-text-stroke/fill` 등 제한적.

## 브라우저 지원

Chrome/Edge 105+, Safari 17.2+, Firefox 140+ (2025-06~) — 전 메이저 브라우저 커버.

## 개발

eunsoolib 모노레포 패키지로 통합되어 있습니다. 진입점은
[src/index.ts](src/index.ts)(core)와 [src/react.tsx](src/react.tsx)(React 어댑터)입니다.

```bash
pnpm test:run packages/highlight-kit   # Vitest (jsdom)
```

`src/highlight-api.d.ts`는 `lib.dom`이 아직 불완전하게 타입한 `HighlightRegistry`의
maplike 멤버(`set`/`get`/`delete` 등)를 보강하는 빌드 전용 선언입니다.

## License

MIT
