# @eunsoolib/highlight-kit

CSS Custom Highlight API 기반 텍스트 하이라이팅 라이브러리. DOM을 건드리지 않고
텍스트를 하이라이트합니다. 프레임워크 무관 core와 얇은 React 어댑터를 제공합니다.

## 설치

```bash
pnpm add @eunsoolib/highlight-kit
```

ESM 전용 패키지이며 타입 정의가 함께 포함됩니다. React 어댑터(`@eunsoolib/highlight-kit/react`)는
`react >= 18`을 필요로 하지만 **optional peer dependency**라, core만 쓰면 React 없이 동작합니다.

## 사용법

### Core (프레임워크 무관)

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

### React

#### 선언적 컴포넌트

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

#### Headless 훅

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

#### 검색 + 네비게이션

```tsx
import { useRef, useState } from 'react'
import {
  HighlightStyles,
  useHighlightSearch,
} from '@eunsoolib/highlight-kit/react'

function Search() {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('wisdom')
  const { count, active, next, prev } = useHighlightSearch(ref, query)

  return (
    <>
      <HighlightStyles />
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <span>{count === 0 ? '0/0' : `${active + 1}/${count}`}</span>
      <button onClick={prev}>↑</button>
      <button onClick={next}>↓</button>
      <div ref={ref}>...본문...</div>
    </>
  )
}
```

전체 매치는 `search`, 현재 항목은 더 높은 priority의 `search-current` 이름으로
하이라이트되고 자동으로 `scrollIntoView`됩니다. `options.name`으로 기본 이름을 바꿀 수
있습니다. `<HighlightStyles />`는 이 두 이름의 기본 색상을 넣어 줍니다.

#### 한 컨테이너에 여러 패턴: `Highlight.Root` + `Highlight.Match`

```tsx
import { Highlight } from '@eunsoolib/highlight-kit/react'

function Logs({ logs }: { logs: string }) {
  return (
    <Highlight.Root name="log-info" as="pre">
      {logs}
      <Highlight.Match name="log-error" pattern={/ERROR:[^\n]*/} />
      <Highlight.Match name="log-warn" pattern={/WARN:[^\n]*/} />
      {/* name 생략 → Root의 name */}
      <Highlight.Match pattern={/INFO:[^\n]*/} />
    </Highlight.Root>
  )
}
```

`Highlight.Match`는 effect-only(`return null`)입니다. Root 컨테이너를 스캔해 하이라이트만
등록하며, 기본으로 DOM 변경을 `MutationObserver`로 추적합니다.

#### 상태만 구독 / 지원 여부

```tsx
import {
  useHighlightState,
  useHighlightSupport,
} from '@eunsoolib/highlight-kit/react'

const { count, active } = useHighlightState('search') // 읽기 전용 구독
const all = useHighlightSnapshots() // { [name]: { count, active } }
const supported = useHighlightSupport() // SSR 중엔 false
```

#### 테스트 / controller 주입

jsdom에는 `Highlight`가 없으므로, 부수효과 없는 sink로 만든 controller를 주입해
bookkeeping만 검증합니다.

```tsx
import {
  createHighlightController,
  createNoopSink,
} from '@eunsoolib/highlight-kit'
import { HighlightProvider } from '@eunsoolib/highlight-kit/react'

const controller = createHighlightController({ sink: createNoopSink() })
render(
  <HighlightProvider controller={controller}>
    <SearchUI />
  </HighlightProvider>,
)
expect(controller.getSnapshot('search').count).toBe(3)
```

## API

### core

| export                                 | 설명                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `highlights`                           | singleton 컨트롤러 (`set` / `remove` / `clear` / `clearAll` / `getRanges` / `subscribe` / `getSnapshot` / `getSnapshots`) |
| `createHighlightController({ sink? })` | 격리된 컨트롤러 생성 (테스트·Provider용)                                                                                  |
| `createCssHighlightSink()`             | `CSS.highlights`에 반영하는 기본 sink                                                                                     |
| `createNoopSink()`                     | 부수효과 없는 sink (SSR/테스트용, 미지원 환경에서도 bookkeeping 수행)                                                     |
| `computeRanges(root, pattern, opts?)`  | 패턴(string/RegExp) 매칭 → `Range[]` (`caseSensitive` / `wholeWord` 옵션)                                                 |
| `rangesFromOffsets(root, spans)`       | 문자 offset 배열 → `Range[]`                                                                                              |
| `getTextNodes(root)`                   | 하위 텍스트 노드 수집                                                                                                     |
| `isHighlightSupported()`               | API 지원 여부                                                                                                             |
| `generateHighlightCSS(styles)`         | `::highlight()` CSS 문자열 생성 (주입 없이 반환)                                                                          |
| `injectHighlightStyles(styles, id?)`   | `::highlight()` CSS 동적 주입 (`<style>` 삽입)                                                                            |

### react (`@eunsoolib/highlight-kit/react`)

| export                                        | 설명                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `useHighlight(opts)`                          | headless. `ref` + `{ count, active, name }` 반환 (`priority`, `observe` 옵션) |
| `useHighlightSearch(ref, query, opts?)`       | 검색 + `next`/`prev` 네비게이션                                               |
| `useTextMatches(target, pattern, opts?)`      | 매칭된 `Range[]` 추적 (ref 또는 element, `observe` 기본 true)                 |
| `useHighlightRanges(name, ranges, priority?)` | 직접 계산한 `Range[]` 등록 (effect-only)                                      |
| `useHighlightState(name)`                     | name의 `{ count, active }` 읽기 전용 구독                                     |
| `useHighlightSnapshots()`                     | 모든 활성 name의 스냅샷 구독                                                  |
| `useHighlightSupport()`                       | 지원 여부 (SSR-safe)                                                          |
| `useHighlightController()`                    | 현재 scope의 컨트롤러                                                         |
| `<HighlightProvider controller?>`             | 컨트롤러 주입 (생략 시 격리된 컨트롤러 생성)                                  |
| `<Highlight query name as>`                   | 선언적 wrapper                                                                |
| `<Highlight.Root>` / `<Highlight.Match>`      | 한 컨테이너에 여러 패턴                                                       |
| `<HighlightStyles styles?>`                   | `::highlight()` 규칙 `<style>` (기본: `search` / `search-current`)            |

타입도 함께 export됩니다: `MatchOptions`, `HighlightSnapshot`, `HighlightController`,
`HighlightSink`, `SourceId`, `UseHighlightOptions`, `UseHighlightResult`,
`UseHighlightSearchOptions`, `UseHighlightSearchResult`, `TextMatchOptions`, `HighlightProps`,
`HighlightRootProps`, `HighlightMatchProps`, `HighlightStyleMap`.

## 설계 노트 / 한계

- **DOM 변경 추적**: `useHighlight` / `<Highlight>`는 기본적으로 `query`/`name`/옵션이
  바뀔 때만 재계산합니다. 동적 콘텐츠면 `observe`를 켜세요. `useTextMatches` /
  `useHighlightSearch` / `<Highlight.Match>`는 기본으로 추적합니다.
- **box model 미지원**: 둥근 테두리 등이 필요하면 `controller.getRanges(name)` →
  `Range.getClientRects()`로 overlay를 직접 그립니다 (`src/demo.tsx` 참고).
- **hit-test 불가**: 하이라이트는 클릭/hover 대상이 아닙니다.
- **이름은 document 전역**: `HighlightProvider` 격리는 구독 그래프/테스트용이며, 같은 DOM에서
  같은 이름을 두 컨트롤러가 칠하면 서로 덮어씁니다.
- **Shadow DOM**: `TreeWalker`는 shadow 경계를 넘지 않습니다.
- **SSR**: `getServerSnapshot`이 항상 빈 스냅샷을 반환하고, 등록은 layout effect에서
  일어나므로 hydration 불일치가 없습니다.
- **`::highlight()` 지원 속성**: `color`, `background-color`, `text-decoration`(브라우저
  차이 있음), `text-shadow`, `-webkit-text-stroke/fill` 등 제한적.

## 브라우저 지원

Chrome/Edge 105+, Safari 17.2+, Firefox 140+ (2025-06~) — 전 메이저 브라우저 커버.

## 개발

eunsoolib 모노레포 패키지로 통합되어 있습니다. 진입점은
[src/index.ts](src/index.ts)(core)와 [src/react.tsx](src/react.tsx)(React 어댑터)이며,
[src/demo.tsx](src/demo.tsx)에 검색·다중 이름·RegExp·range overlay 데모가 있습니다.

> `@eunsoolib/use-highlight-search`는 이 패키지로 통합되었습니다. `HighlightStoreProvider` →
> `HighlightProvider`, `createHighlightStore` → `createHighlightController`,
> `useHighlight(name, ranges)` → `useHighlightRanges(name, ranges)`,
> `store.getSnapshot()[name]` → `controller.getSnapshot(name).count`로 옮기면 됩니다.

```bash
pnpm test:run packages/highlight-kit   # Vitest (jsdom)
```

`src/highlight-api.d.ts`는 `lib.dom`이 아직 불완전하게 타입한 `HighlightRegistry`의
maplike 멤버(`set`/`get`/`delete` 등)를 보강하는 빌드 전용 선언입니다.
