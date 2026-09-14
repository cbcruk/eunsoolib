# @cbcruk/is-overflowing

엘리먼트의 내용이 가로·세로로 넘치는지 감지하는 React 훅입니다.

말줄임(`truncate`) 처리된 텍스트에 툴팁을 붙일지처럼 "내용이 잘렸는지" 알아야 할 때
씁니다.

## 설치

```bash
pnpm add @cbcruk/is-overflowing react
```

브라우저 전용입니다. 크기와 내용 변화 감지에 `ResizeObserver`와 `MutationObserver`를 사용합니다.

## 사용법

```tsx
import { useOverflowDetection } from '@cbcruk/is-overflowing'

function Title({ text }: { text: string }) {
  const { ref, hasHorizontalOverflow } = useOverflowDetection<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="truncate"
      title={hasHorizontalOverflow ? text : undefined}
    >
      {text}
    </div>
  )
}
```

## API

### `useOverflowDetection<T extends HTMLElement = HTMLDivElement>()`

`OverflowDetection<T>`를 반환합니다.

| Field                   | Type                   | Description                   |
| ----------------------- | ---------------------- | ----------------------------- |
| `ref`                   | `RefObject<T \| null>` | 감지할 엘리먼트에 연결할 ref  |
| `hasHorizontalOverflow` | `boolean`              | `scrollWidth > clientWidth`   |
| `hasVerticalOverflow`   | `boolean`              | `scrollHeight > clientHeight` |

### `OverflowDetection<T>`

위 반환값의 타입입니다. `T`의 기본값은 훅과 같은 `HTMLDivElement`입니다.

## 동작 방식

값은 렌더링 중이 아니라 커밋 직후(`useLayoutEffect`, 페인트 전)에 대상 엘리먼트의
`scroll*` / `client*` 크기를 측정해 state로 보관합니다. 이후 다음 경우에 다시 측정하며,
결과가 달라졌을 때만 리렌더합니다.

- 대상 엘리먼트나 직계 자식의 크기가 바뀔 때 (`ResizeObserver`)
- 대상 안의 자식 노드나 텍스트가 바뀔 때 (`MutationObserver`, 하위 트리 전체)
- `ref`가 다른 엘리먼트에 연결되거나 해제된 뒤 리렌더될 때

## 제약

- 첫 렌더링 결과는 두 값 모두 `false`이고, 페인트 전에 측정값으로 한 번 더 렌더링됩니다.
- 손자 이하 노드의 크기만 바뀌고 직계 자식 크기와 DOM 내용은 그대로인 경우(스타일만
  바뀌는 경우 등)는 감지하지 못할 수 있습니다.
- `ResizeObserver`가 없는 환경에서는 내용 변화와 리렌더 시점에만 측정합니다.
