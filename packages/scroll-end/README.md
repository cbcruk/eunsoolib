# @cbcruk/scroll-end

네이티브 `scrollend` 이벤트 기반의 headless React 19 훅 모음입니다. 스크롤 종료·sticky stuck 감지를 타이머 추정 없이 정확하게 다룹니다.

## 왜 `scrollend`인가

`scrollend`는 브라우저가 "스크롤 위치에 더 이상 pending 업데이트가 없고 사용자 제스처가 끝난" 정확한 시점을 제공합니다. scroll-snap 정착 후, 관성 스크롤 종료 후에 발화하죠.

|                | `scroll` + debounce | `scrollend` 기반 (본 라이브러리) |
| -------------- | ------------------- | -------------------------------- |
| 종료 시점      | 타이머 추정         | 브라우저 제공 (정확)             |
| scroll-snap    | 정착 감지 어려움    | 정착 후 발화                     |
| sticky stuck   | rect 매 프레임      | IO sentinel + scrollend 역할분리 |
| 보일러플레이트 | 타이머 관리         | 단일 훅                          |
| 구형 브라우저  | 동작                | 폴리필 entry 제공                |

## 설계 철학

> **scroll 중에는 가벼운 시각 피드백만, scrollend에서 비용이 큰 작업 실행.**

- IntersectionObserver → stuck boolean만 가볍게 갱신 (레이아웃 읽기 없음)
- `scrollend` → DOM 조작 / fetch / 위치 재계산 등 무거운 로직 트리거
- sticky → 시각적 고정만 담당 (CSS)

## 설치

```bash
pnpm add @cbcruk/scroll-end
```

## 사용법

### `useScrollEnd` — 가장 작은 프리미티브

`scrollend`를 구독합니다. 핸들러는 ref로 최신화되어 매 렌더마다 리스너를 재등록하지 않습니다(stale closure 안전).

```tsx
import { useScrollEnd } from '@cbcruk/scroll-end'

useScrollEnd({
  onScrollEnd: () => {
    // snap 정착/관성 종료 후 1회 실행
    updateIndicator()
  },
})

// 특정 스크롤 컨테이너만 관찰
const ref = useRef<HTMLDivElement>(null)
useScrollEnd({ target: ref, onScrollEnd: handleEnd, enabled: isActive })

// 요소가 이 컴포넌트의 리렌더 없이 나타나거나 바뀔 수 있으면 요소를 직접 넘김
const [el, setEl] = useState<HTMLDivElement | null>(null)
useScrollEnd({ target: el, onScrollEnd: handleEnd })
// <div ref={setEl} />
```

대상은 커밋마다 다시 확인하고, 가리키는 요소가 바뀔 때만 리스너를 옮깁니다. 조건부 렌더로 나중에 마운트되거나 다른 노드로 교체된 컨테이너도 따라갑니다.

### `useStuck` — sticky stuck 감지

sticky 요소 바로 위에 0px sentinel을 두고 IO로 관찰합니다. `isStuck`은 실시간으로 갱신되고, `onStuckChange`는 `scrollend`에서만 호출됩니다.

```tsx
import { useStuck } from '@cbcruk/scroll-end'

function Header() {
  const { sentinelRef, isStuck } = useStuck({
    offset: 0,
    onStuckChange: (stuck) => {
      // 무거운 작업은 여기서 (scrollend 시점)
    },
  })

  return (
    <>
      <div ref={sentinelRef} style={{ height: 0 }} />
      <header
        style={{ position: 'sticky', top: 0 }}
        data-stuck={isStuck} // 시각 전환은 CSS로
      >
        ...
      </header>
    </>
  )
}
```

### `useActiveSection` — 현재 활성 sticky 섹션

여러 sticky 섹션 헤더 중 현재 stuck된(=보고 있는) 섹션을 `scrollend` 시점에 한 번만 판정합니다. 사이드 네비/브레드크럼 동기화에 적합하며 스크롤 중 깜빡임이 없습니다.

```tsx
import { useActiveSection } from '@cbcruk/scroll-end'

const sectionRefs = [ref1, ref2, ref3]
const { activeSection } = useActiveSection(sectionRefs)
```

### `isScrollEndSupported`

```ts
import { isScrollEndSupported } from '@cbcruk/scroll-end'

if (!isScrollEndSupported()) {
  /* 폴리필 적용 */
}
```

## API

### `useScrollEnd(options): void`

| 옵션          | 타입                                                                  | 기본값       | 설명                                                                                               |
| ------------- | --------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `onScrollEnd` | `(event: Event) => void`                                              | (필수)       | 스크롤이 끝났을 때 호출                                                                            |
| `target`      | `RefObject<HTMLElement \| null> \| HTMLElement \| null \| 'document'` | `'document'` | 관찰할 스크롤 컨테이너. ref는 훅을 쓴 컴포넌트가 렌더될 때마다 다시 읽고, `null`이면 구독하지 않음 |
| `enabled`     | `boolean`                                                             | `true`       | 언마운트 없이 구독을 끄고 켬                                                                       |

### `useStuck(options?): { sentinelRef, isStuck }`

| 옵션            | 타입                         | 기본값 | 설명                                        |
| --------------- | ---------------------------- | ------ | ------------------------------------------- |
| `offset`        | `number`                     | `0`    | 위에서 몇 px에 닿으면 stuck으로 볼지        |
| `onStuckChange` | `(isStuck: boolean) => void` | —      | `scrollend` 시점에만 최신 stuck 상태로 호출 |

`sentinelRef`는 sticky 요소 바로 위의 0px sentinel에 연결하는 `RefCallback`, `isStuck`은 IntersectionObserver가 갱신하는 실시간 상태입니다.

### `useActiveSection(sectionRefs, options?): { activeSection }`

`sectionRefs`(`RefObject<HTMLElement | null>[]`) 중 활성 기준선(`offset`, 기본 `0`)에 top이 닿은 마지막 섹션을 `scrollend`마다 `activeSection`(`HTMLElement | null`)으로 반환합니다.

### `isScrollEndSupported(): boolean`

네이티브 `scrollend` 지원 여부.

### `installScrollEndPolyfill(target?, options?): () => void`

`@cbcruk/scroll-end/polyfill` entry. `target` 기본값은 `document`, `idleDelay`(ms) 기본값은 `100`이며 해제 함수를 반환합니다.

## 제약

- `target`에 ref를 넘기면 `ref.current`는 **훅을 쓴 컴포넌트가 렌더된 뒤에만** 다시 읽습니다. 자식 컴포넌트의 상태 변화만으로 요소가 마운트·교체되는 경우처럼 이 컴포넌트가 리렌더되지 않으면 변화를 알 수 없으니, callback ref로 요소를 state에 담아 `target`에 요소를 직접 넘기세요.

## 폴리필 (별도 entry)

기본 번들 오염을 막기 위해 폴리필은 별도 경로로 분리되어 있습니다. `scrollend` 미지원 시 스크롤 idle을 감지해 합성 이벤트를 발행합니다.

```ts
import { installScrollEndPolyfill } from '@cbcruk/scroll-end/polyfill'

// 지원 환경이면 no-op, 미지원이면 scroll idle → scrollend 합성
const uninstall = installScrollEndPolyfill(document, { idleDelay: 100 })
```

## SSR

모든 훅은 effect 내부에서만 DOM에 접근하며 초기 `isStuck`/`activeSection`은 `false`/`null`입니다. `window`/`document` 직접 접근은 하지 않습니다.
