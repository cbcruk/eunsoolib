# @cbcruk/highlight-kit

CSS Custom Highlight API 기반 텍스트 하이라이팅 라이브러리. DOM을 건드리지 않고
텍스트를 하이라이트합니다. 프레임워크 무관 core와 얇은 React 어댑터를 제공합니다.

DOM 텍스트는 `Range`로, `<input>`/`<textarea>` **안의 값**은 `OpaqueRange`로
하이라이트합니다. 두 종류를 한 `::highlight()` 이름에 섞어 쓸 수 있습니다.

## 설치

```bash
pnpm add @cbcruk/highlight-kit
```

ESM 전용 패키지이며 타입 정의가 함께 포함됩니다. React 어댑터(`@cbcruk/highlight-kit/react`)는
`react >= 18`을 필요로 하지만 **optional peer dependency**라, core만 쓰면 React 없이 동작합니다.

## 사용법

### Core (프레임워크 무관)

```typescript
import {
  highlights,
  computeRanges,
  injectHighlightStyles,
} from '@cbcruk/highlight-kit'

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

### Form control 안의 텍스트 (`OpaqueRange`)

`Range`는 form control의 값을 가리킬 수 없어서 `computeRanges`로는 `<textarea>`
안을 칠할 수 없습니다. Chromium 152+가 추가한 `element.createValueRange(start, end)`가
이 틈을 메웁니다.

```typescript
import {
  createValueHighlighter,
  injectHighlightStyles,
} from '@cbcruk/highlight-kit'

injectHighlightStyles({
  comment: { color: '#6b7280' },
  keyword: { color: '#7c3aed' },
})

const textarea = document.querySelector('textarea')!
const highlighter = createValueHighlighter({
  element: textarea,
  rules: [
    { name: 'comment', pattern: /\/\/[^\n]*/ },
    { name: 'keyword', pattern: /\b(?:const|function|return)\b/ },
  ],
})

highlighter.dispose() // 등록 해제 + 모든 Range disconnect
```

규칙 순서가 우선순위입니다. 기본 전략(`overlap: 'first'`)은 좌→우로 스캔하며 각
위치에서 먼저 매칭된 규칙이 이기고 그만큼 건너뛰므로, `// const x`에서 comment
규칙이 keyword를 삼킵니다. 규칙마다 독립적으로 전체를 스캔해 겹침을 유지하려면
`overlap: 'all'`을 쓰고 `priority`로 층을 정합니다.

#### 왜 래퍼가 필요한가 — Range 누수

`OpaqueRange`는 **live**입니다. control은 `createValueRange()`로 넘겨준 Range를
모두 보관하면서 편집마다 offset을 갱신합니다. 그래서 키 입력마다 패턴을 다시
매칭하는 흔한 코드는 세대마다 live Range를 쌓습니다 — `Highlight`에서는 빠졌으니
보이지 않지만, control은 계속 갱신합니다.

```typescript
// 누수: 이전 Range를 놓아주지 않는다
function onInput() {
  highlight.clear()
  for (const m of textarea.value.matchAll(/example/g)) {
    highlight.add(textarea.createValueRange(m.index, m.index + 7))
  }
}
```

`createValueHighlighter` / `createValueRangeRegistry`는 새 세대를 commit한 **뒤**
이전 세대를 `disconnect()`합니다 (순서를 뒤집으면 한 프레임 동안 하이라이트가
사라집니다). span을 직접 계산한다면 registry를 쓰세요.

```typescript
import { createValueRangeRegistry } from '@cbcruk/highlight-kit'

const registry = createValueRangeRegistry({ element: textarea })
registry.commit([{ name: 'note', priority: 0, spans: [{ start: 0, end: 4 }] }])
registry.commit([{ name: 'note', priority: 0, spans: [{ start: 6, end: 9 }] }])
registry.dispose()
```

### React

#### 선언적 컴포넌트

```tsx
import { Highlight } from '@cbcruk/highlight-kit/react'

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
import { useHighlight } from '@cbcruk/highlight-kit/react'

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
} from '@cbcruk/highlight-kit/react'

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
import { Highlight } from '@cbcruk/highlight-kit/react'

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

#### Form control 토크나이저

```tsx
import { HighlightStyles, useValueTokens } from '@cbcruk/highlight-kit/react'

const RULES = [
  { name: 'comment', pattern: /\/\/[^\n]*/ },
  { name: 'string', pattern: /'[^']*'|"[^"]*"/ },
  { name: 'keyword', pattern: /\b(?:const|function|return)\b/ },
]

function CodeArea() {
  const { ref, supported, counts } = useValueTokens<HTMLTextAreaElement>(RULES)

  return (
    <>
      <HighlightStyles
        styles={{
          comment: { color: '#6b7280' },
          string: { color: '#16a34a' },
          keyword: { color: '#7c3aed' },
        }}
      />
      <textarea ref={ref} defaultValue="const x = 1 // note" />
      {!supported && <p>이 브라우저는 textarea 안을 칠할 수 없습니다.</p>}
      <small>키워드 {counts.keyword ?? 0}개</small>
    </>
  )
}
```

rules는 **내용으로 비교**하므로 인라인 배열을 그대로 넘겨도 매 렌더마다
highlighter가 재생성되지 않습니다. 단일 패턴이면 `useValueHighlight`:

```tsx
const { ref, count } = useValueHighlight<HTMLTextAreaElement>({
  query: /\bexample\b/gi,
  name: 'flagged',
})
```

controlled 컴포넌트에서 값을 **프로그램적으로** 바꾸면(초기화 버튼, 템플릿
불러오기) 모든 live Range가 collapse되고 `input` 이벤트도 안 나므로, `value`를
넘겨 재계산을 트리거해야 합니다. 사용자 타이핑은 `input`으로 추적되니 필요 없습니다.

```tsx
const { ref } = useValueTokens<HTMLTextAreaElement>(RULES, { value })
```

#### Form control 안에서 검색 + 네비게이션

```tsx
import {
  HighlightStyles,
  useValueHighlightSearch,
} from '@cbcruk/highlight-kit/react'

function NoteSearch() {
  const [query, setQuery] = useState('')
  const { ref, count, active, next, prev } =
    useValueHighlightSearch<HTMLTextAreaElement>(query)

  return (
    <>
      <HighlightStyles />
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <span>{count === 0 ? '0/0' : `${active + 1}/${count}`}</span>
      <button onClick={prev}>↑</button>
      <button onClick={next}>↓</button>
      <textarea ref={ref} rows={10} />
    </>
  )
}
```

현재 매치는 `search-current`로 등록되고, control의 `scrollTop`/`scrollLeft`를
조절해 화면에 들어옵니다. `setSelectionRange()`를 쓰지 않으므로 사용자의 캐럿과
선택 영역을 건드리지 않습니다.

#### 상태만 구독 / 지원 여부

```tsx
import {
  useHighlightState,
  useHighlightSupport,
} from '@cbcruk/highlight-kit/react'

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
} from '@cbcruk/highlight-kit'
import { HighlightProvider } from '@cbcruk/highlight-kit/react'

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
| `rangesFromOffsets(root, spans)`       | 문자 offset 배열 → `Range[]` (`root.textContent` 기준, 공백만 있는 텍스트 노드 포함)                                      |
| `getTextNodes(root)`                   | 하위 텍스트 노드 수집 (공백만 있는 노드 제외)                                                                             |
| `isHighlightSupported()`               | API 지원 여부                                                                                                             |
| `generateHighlightCSS(styles)`         | `::highlight()` CSS 문자열 생성 (주입 없이 반환)                                                                          |
| `injectHighlightStyles(styles, id?)`   | `::highlight()` CSS 동적 주입 (`<style>` 삽입)                                                                            |

#### core — form control (`OpaqueRange`)

| export                                      | 설명                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `createValueHighlighter(opts)`              | control의 값을 토큰화해 계속 하이라이트 (`refresh` / `dispose` / `names` / `supported`) |
| `createValueRangeRegistry(opts)`            | span을 직접 계산할 때 쓰는 한 세대 관리자 (`commit` / `dispose`)                   |
| `tokenizeValue(value, rules, opts?)`        | 순수 토크나이저: 문자열 + 규칙 → `Token[]` (`overlap: 'first' \| 'all'`)           |
| `groupTokens(tokens, rules)`                | `Token[]` → name별 `NamedSpans[]` (priority는 최댓값)                              |
| `createValueRanges(element, spans)`         | 문자 offset → `ValueRange[]` (범위를 넘으면 throw 대신 clamp)                      |
| `disconnectValueRanges(ranges)`             | Range를 놓아줘 control이 더는 추적하지 않게 함                                     |
| `scrollValueRangeIntoView(element, range)`  | control의 스크롤만 조절해 Range를 노출 (선택·캐럿 보존)                            |
| `isValueRangeSupported()`                   | 브라우저 지원 여부 (요소별 지원과 다름)                                            |
| `supportsValueRange(element)`               | 이 요소가 value range를 만들 수 있는지 (type 검사 포함)                            |
| `isValueRange(range)`                       | DOM `Range`와 `ValueRange` 구분                                                    |

### react (`@cbcruk/highlight-kit/react`)

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
| `useValueTokens(rules, opts?)`                | form control 토크나이저. `ref` + `{ supported, counts }`                      |
| `useValueHighlight(opts)`                     | form control 단일 패턴. `ref` + `{ count, active, name, supported }`          |
| `useValueHighlightSearch(query, opts?)`       | form control 내 검색 + `next`/`prev` + 자동 스크롤                            |

타입도 함께 export됩니다: `MatchOptions`, `HighlightRange`, `HighlightSnapshot`,
`HighlightController`, `HighlightSink`, `SourceId`, `TokenRule`, `Token`,
`TokenizeOptions`, `OverlapStrategy`, `NamedSpans`, `ValueRange`, `ValueRangeElement`,
`ValueHighlighter`, `ValueHighlighterOptions`, `ValueRangeRegistry`,
`ValueRangeBindingOptions`, `UseHighlightOptions`, `UseHighlightResult`,
`UseHighlightSearchOptions`, `UseHighlightSearchResult`, `TextMatchOptions`,
`HighlightProps`, `HighlightRootProps`, `HighlightMatchProps`, `HighlightStyleMap`,
`ValueHighlightOptions`, `UseValueTokensOptions`, `UseValueTokensResult`,
`UseValueHighlightOptions`, `UseValueHighlightResult`,
`UseValueHighlightSearchOptions`, `UseValueHighlightSearchResult`.

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
- **`::highlight()` 지원 속성**: `color`, `background-color`, `text-decoration`(과 관련
  속성), `text-shadow`, `stroke-color`/`fill-color`/`stroke-width`, CSS 변수만
  적용됩니다. `border-radius`나 `padding`은 **무시**됩니다. 실제로 전 브라우저에서
  상호운용되는 건 `color`와 `background-color`뿐입니다.
- **`::selection`이 위에 그려짐**: custom highlight는 내장 highlight pseudo-element보다
  아래 쌓입니다. `priority`는 custom highlight **끼리의** 순서일 뿐, `::selection`
  위로 올릴 수는 없습니다.

### form control (`OpaqueRange`) 한계

- **지원 요소가 제한적**: `<textarea>`와 `<input type>`이 `text`/`search`/`tel`/`url`/
  `password`인 경우만. 다른 type은 `NotSupportedError`를 던지므로
  `supportsValueRange(element)`로 확인하세요. `contenteditable`과 커스텀 엘리먼트는
  대상이 아닙니다.
- **Range 수명**: control이 자기가 발급한 Range를 전부 보관하며 편집마다 갱신합니다.
  반드시 `disconnect()`해야 하고, 이 패키지의 `createValueHighlighter` /
  `createValueRangeRegistry`가 대신 처리합니다.
- **자동 disconnect**: 요소 제거, 조상 제거, 다른 document로 adopt, `input`의 `type`
  변경 시 Range가 죽습니다. `type`을 **지원되는 다른 type**으로 바꿀 때도(`text` →
  `search`) 죽습니다. 전체 `value` 대입도 모든 Range를 offset 0으로 collapse시킵니다.
- **`startContainer`/`endContainer`가 `undefined`**: 이 API를 출하하면서 container
  속성이 `AbstractRange`에서 새 `NodeRange`로 옮겨졌습니다. `null`이 아니라
  `undefined`입니다 (익스플레이너와 Chrome 릴리스 노트의 설명이 틀렸습니다).
  `controller.getRanges(name)`을 순회할 때는 `isValueRange(range)`로 좁히고, 위치는
  `getBoundingClientRect()`로 읽으세요.
- **`Range` 전용 API에 못 넣음**: `Selection.addRange()`가 받지 않습니다. `toString()`도
  없으니 텍스트는 `element.value`에서 잘라 쓰세요.
- **스펙 미확정**: DOM/HTML 스펙 PR이 아직 열려 있고, `disconnect()`는 Chromium에만
  있고 스펙 PR에는 없습니다. 그래서 `ValueRange.disconnect`는 optional입니다.

## 브라우저 지원

| 기능                               | 지원                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| Custom Highlight API (DOM `Range`) | Chrome/Edge 105+, Safari 17.2+, Firefox 140+ — 전 메이저 커버     |
| `OpaqueRange` (form control 내부)  | Chrome/Edge 152+ (2026-08-25)만. Safari·Firefox 미구현           |

`OpaqueRange`는 Chromium 전용이지만 WebKit과 Mozilla 모두 **positive/support**
표준 포지션을 냈습니다. 미지원 환경에서는 `supported`가 `false`가 되고 훅이 아무
일도 하지 않으므로, control은 평소대로 렌더링됩니다 — 조건 없이 호출해도 안전합니다.

## 개발

eunsoolib 모노레포 패키지로 통합되어 있습니다. 진입점은
[src/index.ts](src/index.ts)(core)와 [src/react.tsx](src/react.tsx)(React 어댑터)이며,
[src/demo.tsx](src/demo.tsx)에 검색·다중 이름·RegExp·range overlay 데모가 있습니다.

> `@cbcruk/use-highlight-search`는 이 패키지로 통합되었습니다. `HighlightStoreProvider` →
> `HighlightProvider`, `createHighlightStore` → `createHighlightController`,
> `useHighlight(name, ranges)` → `useHighlightRanges(name, ranges)`,
> `store.getSnapshot()[name]` → `controller.getSnapshot(name).count`로 옮기면 됩니다.

```bash
pnpm test:run packages/highlight-kit   # Vitest (jsdom)
```

`src/highlight-api.d.ts`는 `lib.dom`이 아직 불완전하게 타입한 `HighlightRegistry`의
maplike 멤버(`set`/`get`/`delete` 등)를 보강하는 빌드 전용 선언입니다.
