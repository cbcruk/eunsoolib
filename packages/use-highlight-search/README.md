# @eunsoolib/use-highlight-search

CSS Custom Highlight API의 React 바인딩. DOM을 다시 쓰지 않고 `::highlight()`
pseudo로 텍스트에 스타일을 입힌다.

## 설치

```bash
pnpm add @eunsoolib/use-highlight-search
```

## 구조

프레임워크 무관 코어 + React 바인딩 + 선언적 컴포넌트의 3계층.

```
createHighlightStore (core)
  ├─ bookkeeping : name -> sourceId -> Range[]   ← 항상 동작
  └─ sink        : CSS.highlights 반영            ← 부수효과만 격리 (주입 가능)
        │
  React bindings
  ├─ write : useHighlight        → useLayoutEffect → store.setRanges
  └─ read  : useHighlightSnapshot → useSyncExternalStore
        │
  Components
  └─ <Highlight.Root> + <Highlight.Match>
```

핵심은 **write/read 분리**다. Range 등록(write)은 리렌더가 필요 없는 부수효과라
`useLayoutEffect`에서만 하고, count/snapshot(read)은 `useSyncExternalStore`로만 읽는다.

## 검색 + 네비게이션

```tsx
import { useRef, useState } from 'react'
import {
  HighlightStyles,
  useHighlightSearch,
} from '@eunsoolib/use-highlight-search'

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
하이라이트된다. 현재 항목은 자동으로 `scrollIntoView`된다.

## 선언적 컴포넌트

여러 이름을 동시에 칠하거나 RegExp로 칠할 때.

```tsx
import { Highlight, HighlightStyles } from '@eunsoolib/use-highlight-search'
;<>
  <HighlightStyles />
  <Highlight.Root name="log-info" as="pre">
    {logs}
    <Highlight.Match name="log-error" pattern={/ERROR:[^\n]*/} />
    <Highlight.Match name="log-warn" pattern={/WARN:[^\n]*/} />
  </Highlight.Root>
</>
```

`Highlight.Match`는 effect-only(`return null`)다. children을 렌더하지 않고 Root의
컨테이너를 스캔해 같은 트리에 하이라이트만 등록한다.

## API

### 코어

| 항목                            | 설명                                               |
| ------------------------------- | -------------------------------------------------- |
| `createHighlightStore(options)` | 프레임워크 무관 store 생성. `{ sink }` 주입 가능   |
| `createCssHighlightSink()`      | `CSS.highlights`에 반영하는 브라우저 sink (기본값) |
| `createNoopSink()`              | 부수효과 없는 sink (SSR/테스트용)                  |
| `defaultStore`                  | Provider 없이도 동작하는 모듈 싱글턴               |
| `isSupported()`                 | CSS Custom Highlight API 지원 여부                 |

### React

| 항목                                       | 설명                                   |
| ------------------------------------------ | -------------------------------------- |
| `HighlightStoreProvider`                   | store 주입. 생략 시 모듈 싱글턴 사용   |
| `useHighlightSearch(ref, query, options?)` | 검색 + next/prev 네비게이션            |
| `useTextMatches(ref, pattern, options?)`   | 매칭된 Range[] 추적 (MutationObserver) |
| `useHighlight(name, ranges, priority?)`    | Range[]를 store에 등록 (effect-only)   |
| `useHighlightSnapshot()`                   | `name -> count` 스냅샷 구독            |
| `useHighlightCount(name)`                  | 특정 name의 Range 개수                 |
| `findTextMatches(node, pattern, options?)` | TreeWalker 기반 순수 매처              |
| `Highlight` / `HighlightStyles`            | 선언적 컴포넌트 + 기본 색상 스타일     |

`options`: `{ caseSensitive?, wholeWord?, observe? }`.

## 플랫폼 제약

- `::highlight()`는 **box model 미지원**. color / background-color /
  text-decoration / text-shadow 만 먹는다. 둥근 테두리가 필요하면
  `Range.getClientRects()` 기반 overlay로 그려야 한다.
- 하이라이트는 **hit-test 불가** (클릭/hover 대상이 아님).
- `CSS.highlights`는 **document 전역**이라 *이름*이 공유된다. Provider 격리는
  테스트/구독 그래프용이지 같은 DOM에서 같은 이름의 store 둘을 돌리는 용도가 아니다.
- `TreeWalker`는 **Shadow DOM 경계를 넘지 않는다**.

## 테스트

sink 주입으로 `CSS.highlights` 없이도 store를 검증한다 (jsdom엔 Highlight가 없음).

```tsx
const store = createHighlightStore({ sink: createNoopSink() })
render(
  <HighlightStoreProvider store={store}>
    <SearchUI />
  </HighlightStoreProvider>,
)
expect(store.getSnapshot().search).toBe(3)
```
