# @cbcruk/with-defaults

컴포넌트에 기본 props를 미리 채우고, 기본값을 준 prop을 호출부에서 선택(optional)
prop으로 바꿔 주는 HOC입니다.

`<Text type="body2_600" color={...}>` 같은 원자 컴포넌트 선언이 render 곳곳에 반복될 때,
자주 쓰는 조합을 `Body2Gray` 같은 preset 컴포넌트로 캡슐화하는 용도입니다.

## 설치

```bash
pnpm add @cbcruk/with-defaults react
```

React 19의 ref-as-prop을 전제로 합니다.

## 사용법

```tsx
import type { ReactNode } from 'react'
import { withDefaults } from '@cbcruk/with-defaults'

type TextProps = {
  type: 'body2_600' | 'heading1_600' // 필수
  color?: string
  children?: ReactNode
}

function Text({ type, color, children }: TextProps) {
  return (
    <span data-type={type} style={{ color }}>
      {children}
    </span>
  )
}

export const Body2Gray = withDefaults(
  Text,
  { type: 'body2_600', color: 'gray' },
  'Body2Gray',
)

function Profile({ name }: { name: string }) {
  return (
    <>
      <Body2Gray>{name}</Body2Gray> {/* type 생략 가능 */}
      <Body2Gray color="red">{name}</Body2Gray> {/* 호출부 prop이 우선 */}
    </>
  )
}
```

호스트 엘리먼트도 감쌀 수 있고, `ref`는 일반 prop처럼 내부 컴포넌트로 전달됩니다.

```tsx
const Card = withDefaults('div', { role: 'group', className: 'card' })

function Example() {
  const ref = useRef<HTMLDivElement>(null)

  return <Card ref={ref}>content</Card>
}
```

## API

### `withDefaults(Component, defaults, displayName?)`

`<Component {...defaults} {...props} />`를 렌더링하는 함수 컴포넌트를 반환합니다.

| 인자          | 타입          | 설명                                               |
| ------------- | ------------- | -------------------------------------------------- |
| `Component`   | `ElementType` | 감쌀 컴포넌트 또는 태그 이름(`'div'` 등)           |
| `defaults`    | `Defaults<C>` | 미리 채울 props                                    |
| `displayName` | `string`      | 생략하면 `withDefaults(<대상 이름>)`으로 자동 생성 |

- props는 얕게 덮어씁니다. `className`, `style` 등도 병합되지 않고 호출부 값으로
  대체됩니다.
- 대상 이름은 태그 문자열, 컴포넌트의 `displayName`, `name` 순으로 찾고 없으면
  `'Component'`를 씁니다.

### 타입

```ts
// 기본값을 준 키만 optional로 전환
type WithDefaults<P, D> = Omit<P, keyof D> &
  Partial<Pick<P, Extract<keyof D, keyof P>>>

type Defaults<C extends ElementType> = Partial<ComponentPropsWithRef<C>>
```

## 설계 노트

`withDefaults`가 실제로 하는 일은 "기본값을 준 prop을 optional로 바꾸는 것" 하나입니다.
그래서 preset으로 채우는 prop이 원래 선택 prop이라면 평범한 wrapper 컴포넌트로
충분하고, **필수 prop**을 **여러 preset**에 걸쳐 채울 때 값어치가 있습니다.

preset 이름은 안정적인 축(텍스트 scale, 버튼의 역할)으로 고정하고 자주 바뀌는 축(색 등)은
prop으로 남겨 조합 폭발을 피하는 것을 권장합니다. 검토했다가 버린 대안과 명명 원칙은
[DESIGN.md](./DESIGN.md)에 정리되어 있습니다.
