# @cbcruk/checkbox-group

선택 상태를 제출 시점에만 올려보내는 체크박스 그룹 컴포넌트

체크하는 동안의 선택(draft)은 폼 안에서만 바뀌고, 제출 버튼을 눌러야 확정(commit)되어
콜백으로 올라갑니다. 필터 패널처럼 "고른 뒤 적용"하는 UI에 맞춘 컴포넌트입니다.

## 설치

```bash
pnpm add @cbcruk/checkbox-group react
```

## 사용법

```tsx
import { useState, type Key } from 'react'
import { CheckboxGroup } from '@cbcruk/checkbox-group'

const frameworks = [
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'svelte', label: 'Svelte' },
]

function Example() {
  const [applied, setApplied] = useState<Array<Key>>(['react'])

  return (
    <CheckboxGroup
      list={frameworks}
      defaultSelected={applied}
      onChange={(selected) => setApplied(selected.map((item) => item.key))}
      submitLabel="적용"
    />
  )
}
```

- 체크박스를 클릭하는 동안에는 어떤 콜백도 호출되지 않습니다.
- 제출하면 `onSubmit`이 항상 호출되고, 선택이 직전에 확정된 선택과 달라졌을 때만
  `onChange`가 먼저 호출됩니다. 처음 확정된 선택은 `defaultSelected`입니다.
- 두 콜백 모두 선택된 항목(`{ key, label }`)을 클릭 순서가 아닌 `list` 순서로 받습니다.

스타일은 Tailwind 유틸리티 클래스로 작성되어 있습니다.

## API

### `<CheckboxGroup />`

| Prop              | Type                                        | Default    | Description                                           |
| ----------------- | ------------------------------------------- | ---------- | ----------------------------------------------------- |
| `list`            | `Array<CheckboxGroupOption>`                | —          | 렌더링할 선택지 목록                                  |
| `defaultSelected` | `Array<Key>`                                | `[]`       | 처음에 선택해 둘 항목의 `key`. 첫 렌더링에만 쓰임     |
| `onChange`        | `(selected: CheckboxGroupOption[]) => void` | —          | 제출한 선택이 직전에 확정된 선택과 다를 때 호출       |
| `onSubmit`        | `(selected: CheckboxGroupOption[]) => void` | —          | 제출할 때마다 호출. 선택이 바뀌었으면 `onChange` 다음 |
| `submitLabel`     | `ReactNode`                                 | `'Submit'` | 제출 버튼에 표시할 내용                               |

### 타입

```ts
type CheckboxGroupOption = { key: Key; label: string }
type CheckboxGroupProps = {
  /* 위 표의 props */
}
```

`Key`는 React의 `Key`(`string | number | bigint`) 타입입니다. `list`에 없는
`defaultSelected`의 `key`는 무시됩니다.

## 제약

- 비제어 컴포넌트입니다. `defaultSelected`는 첫 렌더링에만 쓰이므로, 마운트 후 바꿔도
  체크 상태가 따라가지 않습니다. 선택을 초기화하려면 `key`를 바꿔 다시 마운트하세요.
- 전체 선택/해제 버튼은 없습니다.
