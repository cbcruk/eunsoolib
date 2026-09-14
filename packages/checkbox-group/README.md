# @cbcruk/checkbox-group

체크하는 동안의 선택은 폼 안에서만 바꾸고, 제출할 때만 확정 상태로 올려보내는 체크박스
그룹 컴포넌트입니다.

ahooks의 `useSelections`를 두 겹으로 써서 초안(draft) 상태와 확정(commit) 상태를
분리합니다. 체크박스를 클릭해도 확정 상태는 그대로이고, `Submit` 버튼을 눌러야
반영됩니다.

## 설치

```bash
pnpm add @cbcruk/checkbox-group react
```

## 사용법

```tsx
import { CheckboxGroup } from '@cbcruk/checkbox-group'

const frameworks = [
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'svelte', label: 'Svelte' },
]

function Example() {
  return <CheckboxGroup list={frameworks} defaultSelected={['react']} />
}
```

렌더링 결과는 다음 두 부분으로 구성됩니다.

- 확정 상태를 JSON으로 보여 주는 `<pre data-testid="selected">`
  (`selected`, `noneSelected`, `allSelected`, `partiallySelected`)
- 체크박스 목록과 `Submit` 버튼이 있는 폼

스타일은 Tailwind 유틸리티 클래스로 작성되어 있습니다.

## API

### `<CheckboxGroup list defaultSelected />`

| Prop              | Type                                 | Default | Description                   |
| ----------------- | ------------------------------------ | ------- | ----------------------------- |
| `list`            | `Array<{ key: Key; label: string }>` | —       | 렌더링할 선택지 목록          |
| `defaultSelected` | `Array<Key>`                         | —       | 처음에 선택해 둘 항목의 `key` |

`Key`는 React의 `Key`(`string | number | bigint`) 타입입니다. `defaultSelected`는 첫
렌더링에만 쓰입니다.

## 제약

확정된 선택값을 컴포넌트 밖으로 받는 콜백 prop(`onChange`, `onSubmit` 등)이 없습니다.
확정 상태는 컴포넌트 안의 JSON 출력으로만 확인할 수 있어, 현재는 draft/commit 패턴을
보여 주는 예제에 가깝습니다.
