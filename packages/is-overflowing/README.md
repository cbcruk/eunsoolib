# @cbcruk/is-overflowing

엘리먼트의 내용이 가로·세로로 넘치는지 감지하는 React 훅입니다.

말줄임(`truncate`) 처리된 텍스트에 툴팁을 붙일지처럼 "내용이 잘렸는지" 알아야 할 때
씁니다.

## 설치

```bash
pnpm add @cbcruk/is-overflowing react
```

브라우저 전용입니다. 크기 변화 감지에 ahooks의 `useSize`를 사용합니다.

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

위 반환값의 타입입니다. `T`의 기본값은 `HTMLElement`입니다.

## 동작 방식

값은 렌더링 중에 `ref.current`의 `scroll*` / `client*` 크기를 읽어 계산합니다.
`useSize`가 대상 엘리먼트의 크기 변화를 관찰해 리렌더를 일으키므로, 크기가 바뀌면
다시 계산됩니다.

- 첫 렌더링에는 `ref`가 아직 연결되지 않아 두 값 모두 `false`입니다.
- 엘리먼트 자체 크기는 그대로인 채 내용만 바뀌면(고정 폭 요소의 텍스트 교체 등)
  리렌더가 일어나지 않아 값이 갱신되지 않을 수 있습니다. 이때는 부모 리렌더에 기대게
  됩니다.
