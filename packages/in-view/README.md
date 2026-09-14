# @cbcruk/in-view

`IntersectionObserver`로 엘리먼트가 뷰포트에 들어오는 순간을 감지하는 React 컴포넌트와
훅입니다. 무한 스크롤의 "다음 페이지 불러오기" 트리거 같은 곳에 씁니다.

## 설치

```bash
pnpm add @cbcruk/in-view react
```

브라우저 전용입니다.

## 사용법

### 컴포넌트

```tsx
import { InView } from '@cbcruk/in-view'

function NextPageTrigger({ fetchNextPage, hasNextPage }: Props) {
  return (
    <InView onIntersect={fetchNextPage} enabled={hasNextPage} threshold={0.5}>
      <p>불러오는 중...</p>
    </InView>
  )
}
```

`InView`는 `<div>`를 렌더링하며, 나머지 prop(`className` 등)은 그 `<div>`로 전달됩니다.

### 훅

```tsx
import { useIntersectionObserver } from '@cbcruk/in-view'

function Sentinel({ onIntersect }: { onIntersect: () => void }) {
  const { ref } = useIntersectionObserver({ onIntersect })

  return <div ref={ref} />
}
```

`onIntersect`는 최신 참조를 내부 ref에 보관하므로 인라인 함수를 넘겨도 옵저버가 다시
만들어지지 않습니다. 옵저버는 `enabled`, `threshold`, `root`, `rootMargin`이 바뀔 때만
다시 만들어집니다.

`<div>`가 아닌 엘리먼트를 관찰하려면 타입 인자를 넘깁니다.

```tsx
const { ref } = useIntersectionObserver<HTMLLIElement>({ onIntersect })

return <li ref={ref} />
```

## API

### `useIntersectionObserver<T extends Element = HTMLDivElement>(options)`

`{ ref }`를 반환합니다. `ref`(`RefObject<T | null>`)를 대상 엘리먼트에 연결하면, 대상이
교차 상태가 될 때마다 `onIntersect`를 호출합니다. 벗어났다가 다시 들어오면 다시 호출됩니다.

| Option        | Type                          | Default | Description                                |
| ------------- | ----------------------------- | ------- | ------------------------------------------ |
| `onIntersect` | `() => void`                  | —       | 교차 상태가 됐을 때 호출 (항상 최신 함수)  |
| `enabled`     | `boolean`                     | `true`  | `false`면 관찰하지 않음                    |
| `threshold`   | `number`                      | `0.1`   | `IntersectionObserver`의 `threshold`       |
| `root`        | `Element \| Document \| null` | `null`  | 교차 판정 기준 엘리먼트. `null`이면 뷰포트 |
| `rootMargin`  | `string`                      | `'0px'` | 기준 영역의 여백 (CSS `margin` 문법)       |

### `<InView />`

위 훅의 옵션에 `children: ReactNode`(필수)를 더하고, `<div>`의 나머지 props를 받습니다.
`ref`를 넘기면 관찰 대상 `<div>`에 함께 연결됩니다(객체 ref, 콜백 ref 모두 지원).

## 제약

- `InView`는 항상 `<div>`를 렌더링합니다. 다른 엘리먼트가 필요하면 훅을 직접 사용하세요.
- 훅의 `ref`는 객체 ref라서, 마운트 이후 대상 엘리먼트 자체가 다른 노드로 바뀌면 옵션이
  바뀔 때까지 새 노드를 관찰하지 않습니다.
- `root`에 엘리먼트를 넘길 때는 렌더링 시점에 실제 엘리먼트가 있어야 합니다(state에 담은
  노드 등). 렌더 중 `ref.current`는 첫 렌더에 `null`입니다.
