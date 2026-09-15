# @cbcruk/with-defaults

컴포넌트에 기본 props를 미리 채우고, 기본값을 준 prop을 호출부에서 선택(optional)
prop으로 바꿔 주는 HOC입니다.

`<Text type="body2_600" color={...}>` 같은 원자 컴포넌트 선언이 render 곳곳에 반복될 때,
자주 쓰는 조합을 `Body2Gray` 같은 preset 컴포넌트로 캡슐화하는 용도입니다.

## 설치

```bash
pnpm add @cbcruk/with-defaults react
```

React 19의 ref-as-prop을 전제로 합니다. 타입 선언에 `const` 타입 매개변수와 `NoInfer`를
쓰므로 TypeScript 5.4 이상이 필요합니다.

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
// 기본값이 들어맞는 키만 optional로 전환하고, 유니온 props는 멤버별로 변환
type WithDefaults<P, D> = P extends unknown
  ? Omit<P, DefaultedKeys<P, D>> & Partial<Pick<P, DefaultedKeys<P, D>>>
  : never

// withDefaults의 defaults 인자로 받을 수 있는 props
type Defaults<C extends ElementType> = Partial<ComponentPropsWithRef<C>>

// 컴포넌트 prop이 아닌 키(data-* 제외)를 never로 막는 검사 타입
type NoExtraDefaults<C extends ElementType, D> = {
  [K in Exclude<
    keyof D,
    KeysOfUnion<ComponentPropsWithRef<C>> | `data-${string}`
  >]: never
}
```

`DefaultedKeys<P, D>`는 `D`의 키 중 값이 `P`의 해당 prop 타입에 들어맞는 키,
`KeysOfUnion<P>`는 유니온 멤버 어느 하나에라도 있는 키입니다(둘 다 내부 타입).

- `defaults`는 `const` 타입 매개변수로 추론되어 `'body2_600'` 같은 리터럴이 유지됩니다.
  기본값을 주지 않은 필수 prop은 호출부에서도 계속 필수입니다.
- 컴포넌트 prop이 아닌 키를 `defaults`에 넣으면 인라인 객체든 미리 선언한 객체든 타입
  에러입니다. `data-*` 속성은 예외로 허용합니다.
- 판별 유니온 props는 멤버별 모양을 유지합니다. 판별자에 기본값을 주면(`{ variant: 'link' }`)
  그 멤버에서만 판별자가 optional이 되고, 다른 멤버를 쓰려면 판별자를 직접 넘겨야 합니다.

```tsx
type LinkOrButtonProps =
  | { variant: 'link'; href: string; size: 'small' | 'medium' }
  | { variant: 'button'; onClick: () => void; size: 'small' | 'medium' }

const Small = withDefaults(LinkOrButton, { size: 'small' })

const ok = <Small variant="link" href="/" />
// @ts-expect-error link 멤버에는 href가 필수
const missingHref = <Small variant="link" />
```

## 제약

- `defaults`를 `Partial<Props>`처럼 선택 prop으로 선언한 타입으로 넘기면 어떤 키에 값이
  있는지 타입으로 알 수 없어, 선언된 키가 모두 optional로 바뀝니다. 필수 prop을 정확히
  남기려면 객체 리터럴을 직접 넘기거나 `as const`로 선언하세요.

## 설계 노트

`withDefaults`가 실제로 하는 일은 "기본값을 준 prop을 optional로 바꾸는 것" 하나입니다.

| 조건                                                               | 권장                    |
| ------------------------------------------------------------------ | ----------------------- |
| preset으로 채우는 prop이 원래 **선택** prop                        | 평범한 wrapper 컴포넌트 |
| **필수** prop을 **여러 preset**에 걸쳐, **여러 컴포넌트**에서 채움 | `withDefaults` 팩토리   |

선택 prop이라면 wrapper에서도 이미 생략할 수 있으므로 `withDefaults`로 얻는 이득이 없습니다.

### 명명: 안정적인 축은 이름으로, 자주 바뀌는 축은 prop으로

- `Heading1Gray`, `Body1Red`처럼 `type × color`를 이름에 담으면 컴포넌트 수가 곱셈으로
  늘어납니다. 텍스트는 scale/weight를 이름으로(`Heading1`, `Body2`) 두고 색은
  `<Body2 color="red">`처럼 prop으로 남깁니다.
- 버튼은 생김새(`PrimarySolidButton`)가 아니라 역할(`AddButton`, `SubmitButton`,
  `DeleteButton`)로 이름 짓습니다.
- preset은 가능한 조합을 모두 채우는 매트릭스가 아니라, 실제로 쓰는 조합만 골라 둡니다.

### 검토했다가 쓰지 않은 대안

- **preset 훅(`useBody2Gray()`)**: 상수 객체만 반환한다면 훅일 이유가 없고 Rules of Hooks
  제약만 생깁니다. 테마 컨텍스트에서 색을 읽는 등 실제로 훅이 필요할 때만 정당합니다.
- **className 미리 계산**: CSS-in-JS 라이브러리가 같은 입력의 클래스를 이미 캐싱한다면
  모듈 로드 시점에 계산해 둬도 이득이 없고, 동적 값에는 쓸 수 없는 제약만 남습니다.
- **props를 함수로 받아 가공하는 prop**: 렌더 prop 등 기존 합성 수단과 병합 지점이 둘로
  갈라지므로 두지 않았습니다.
