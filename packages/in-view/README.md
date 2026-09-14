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

`onIntersect`가 effect 의존성에 들어가므로 `useCallback` 등으로 참조를 고정하세요.
렌더링마다 새 함수를 넘기면 옵저버가 매번 다시 만들어지고, 대상이 계속 보이는 동안
콜백이 반복 호출될 수 있습니다.

## API

### `useIntersectionObserver(options)`

`{ ref }`를 반환합니다. `ref`(`RefObject<HTMLDivElement | null>`)를 대상 `<div>`에
연결하면, 대상이 교차 상태가 될 때마다 `onIntersect`를 호출합니다. 벗어났다가 다시
들어오면 다시 호출됩니다.

| Option        | Type         | Default | Description                          |
| ------------- | ------------ | ------- | ------------------------------------ |
| `onIntersect` | `() => void` | —       | 교차 상태가 됐을 때 호출             |
| `enabled`     | `boolean`    | `true`  | `false`면 관찰하지 않음              |
| `threshold`   | `number`     | `0.1`   | `IntersectionObserver`의 `threshold` |

### `<InView />`

위 훅의 옵션에 `children: ReactNode`(필수)를 더하고, `<div>`의 나머지 props를 받습니다.
`root`, `rootMargin`은 지원하지 않으며 항상 뷰포트 기준으로 관찰합니다.
