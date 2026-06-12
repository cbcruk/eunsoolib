# @eunsoolib/reset-boundary

`deps`가 바뀌면 경계 안의 상태를 초기값으로 되돌리는 React 컴포넌트입니다.

`use-state-with-deps`와 동일한 비교 의미론(`Object.is` + 길이 비교)을 쓰되, state를 직접 다루지 않고 **`key` 기반 remount**로 리셋합니다. deps를 직렬화하지 않으므로 객체·함수·배열 deps도 참조 기준으로 안전하게 처리됩니다.

## 설치

```bash
pnpm add @eunsoolib/reset-boundary
```

## 사용법

```tsx
import { ResetBoundary, Resettable } from '@eunsoolib/reset-boundary'

function ProductReview({ productId }: { productId: string }) {
  return (
    <ResetBoundary deps={[productId]}>
      <Resettable initial="">
        {(text, setText) => (
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
        )}
      </Resettable>
    </ResetBoundary>
  )
}
```

`productId`가 바뀌면 `<Resettable>` 안의 입력 상태가 초기값(`""`)으로 돌아갑니다.

## 동작 방식

- `<ResetBoundary>`는 deps 변경 횟수를 "리셋 버전"으로 카운트해 컨텍스트로 내려줍니다.
- `<Resettable>`은 그 버전을 `key`로 내부 컴포넌트를 렌더하므로, 버전이 바뀌면 remount되어 `useState`가 `initial`로 다시 초기화됩니다.
- 경계 자신은 remount되지 않으므로, **경계 안에 있되 `<Resettable>` 밖에 있는 상태는 보존**됩니다.

## API

### `<ResetBoundary deps={...}>`

| Prop       | Type                 | Description                                                   |
| ---------- | -------------------- | ------------------------------------------------------------- |
| `deps`     | `readonly unknown[]` | 변경되면 경계 안의 모든 `<Resettable>`을 리셋하는 의존성 배열 |
| `children` | `ReactNode`          | 경계 내부 트리                                                |

deps 비교는 길이가 다르거나 한 원소라도 `Object.is`로 다르면 변경으로 간주합니다. (`[1, 2]` → `[1, 2, 3]`도 리셋)

### `<Resettable initial={...}>`

| Prop       | Type                                                             | Description                                  |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `initial`  | `T \| (() => T)`                                                 | `useState`와 동일한 값 또는 lazy initializer |
| `children` | `(state: T, setState: Dispatch<SetStateAction<T>>) => ReactNode` | render prop                                  |

`<ResetBoundary>` 밖에서 렌더하면 에러를 던집니다.

## 라이선스

MIT
