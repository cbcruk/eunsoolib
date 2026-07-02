# Atom 컴포넌트 Preset 설계 — `withDefaults` 정리

render 영역에서 `<Text type="body2_600" color={...}>` 같은 원자 선언이 반복되어
비즈니스 로직과 섞이는 문제를, preset을 미리 캡슐화해 해결하는 방법에 대한 논의 정리.

---

## 1. 핵심 결정 규칙

| 조건                                                                     | 결론                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| preset으로 넣는 prop이 **옵셔널**                                        | **plain wrapper**로 충분. `withDefaults` 오버엔지니어링 |
| preset prop이 **필수** + preset을 **여러 개** + **여러 컴포넌트**에 걸침 | **`withDefaults`** 범용 팩토리가 값어치                 |

- `withDefaults`가 하는 **유일한 실질 작업** = "기본값을 준 prop을 호출부에서 optional로 전환".
- 이 변환은 prop이 **필수**일 때만 의미가 있다. 옵셔널이면 plain wrapper에서 이미 안 줘도 되므로 이득 0.

### 실제 케이스 판정

- **Button**: `styleType`, `size` 모두 옵셔널 → plain wrapper로 충분.
- **Text**: `type` 필수(40개 flat union) → `withDefaults`가 실익 있음.

첫 논의에서 `withDefaults`를 접었던 이유는 "옵셔널 Button 하나"만 봤기 때문.
요구가 "필수 prop + 다수 preset + 여러 컴포넌트"로 커지면서 다시 정답이 됨.

---

## 2. 명명 원칙 — 조합 폭발을 피한다

핵심: **안정적인 축은 이름으로 고정, 변하는 축은 prop으로 남긴다.**

- ❌ `Heading1Gray`, `Body1Red` … → `type × color` 곱셈으로 컴포넌트 수 폭발.
- ❌ `PrimarySolidButton`, `DangerOutlineButton` … → `intent(5) × variant(5) × size(4)` = 100개 매트릭스.
- ✅ **Text**: scale/weight(안정)를 이름으로 → `Heading1`, `Body2`. 색은 prop: `<Body1 color="red">`.
- ✅ **Button**: **role(역할)**을 이름으로 → `AddButton`, `SubmitButton`, `DeleteButton`, `CancelButton`.
  버튼의 의미 단위는 "secondarySolid small"(생김새)이 아니라 "추가 버튼"(역할)이다.

> preset은 매트릭스를 채우는 게 아니라 **실사용 조합만 큐레이션**한다.

---

## 3. 검토했다가 폐기한 대안들

### `prps` 함수 prop (props를 함수로 받아 머지)

- "들어온 props를 런타임 가공"은 **base-ui `render`의 함수 시그니처가 이미 담당**.
  → mergeProps 진입점을 둘로 만드는 셈이라 폐기.
- 현재 코드의 `prps`는 구조분해만 하고 미사용 = 조용히 버려지는 죽은 코드.

### `useProps` / `useBody2Gray()` 훅

- 리턴이 상수 객체뿐이면 **hook일 이유 없음**. Rules of Hooks 제약만 짊어짐.
- `useRender`가 hook인 건 ref 병합·polymorphic 분기 등 **진짜 로직**이 있기 때문. 이름만 닮았을 뿐.
- **예외**: `color`가 테마 컨텍스트에서 나오면(다크모드 등) `useTheme()` 읽기가 필요 → 그때만 진짜 hook 정당.

### className 미리 계산 (모듈 로드 시 `styles.text(...)` 1회)

- `styles.text`는 `@emotion/css`의 `css` → **같은 입력이면 캐시된 클래스 즉시 반환, 중복 등록 없음.**
- 미리 계산해도 emotion이 이미 하는 캐싱과 겹침 → **실익 없음.**
- 게다가 정적 인자에만 적용 가능(color 동적이면 깨짐)이라 제약만 남음.
- 결론: 재계산 걱정 자체가 불필요. 가장 단순한 "prop 전달 + 팩토리"가 최선.

---

## 4. 최종 구현 — 범용 `withDefaults` (ref-as-prop)

```tsx
import type { ComponentPropsWithRef, ElementType } from 'react'

// 기본값을 준 키만 optional로 전환
type WithDefaults<P, D> = Omit<P, keyof D> &
  Partial<Pick<P, Extract<keyof D, keyof P>>>

function withDefaults<
  C extends ElementType,
  D extends Partial<ComponentPropsWithRef<C>>,
>(Component: C, defaults: D, displayName?: string) {
  type P = ComponentPropsWithRef<C>
  function Wrapped(props: WithDefaults<P, D>) {
    const Comp = Component as ElementType // 제네릭 spread에 대한 TS 한계 회피 (내부 격리)
    return <Comp {...defaults} {...props} />
  }
  Wrapped.displayName = displayName ?? `withDefaults(${/* 대상 이름 */ ''})`
  return Wrapped
}
```

React 19에선 `ref`가 일반 prop이라 `forwardRef` 래핑이 불필요하다.
`ComponentPropsWithRef`가 `ref`를 포함하므로 `{...props}` 스프레드만으로 ref가
그대로 내부 컴포넌트로 흘러간다 → 별도 `ref` 인자·`<Comp ref={ref} ...>` 없이 한 줄.

첫 버전 대비 차이: `ComponentProps` → `ComponentPropsWithRef`, `forwardRef` 대신
ref-as-prop 일반 함수 컴포넌트. `displayName`은 미지정 시 대상 이름으로 자동 생성.

### 주의

- **className 병합**: 각 컴포넌트가 내부에서 이미 `cx(styles.text(...), className)`를 처리하면 팩토리에서 또 할 필요 없음. defaults의 className과 호출부 className을 합쳐야 할 때만 팩토리에 cx 추가.
- **`{...defaults} {...props}` 순서**: 호출부 prop이 defaults를 override(합쳐지지 않고 덮어씀).
- **기본 color 출처**: `styles.text`가 `color || COLORS.GRAY_100` 자체 기본값을 가짐 → preset에서 color 생략 시 GRAY_100.

---

## 5. 적용 예시

```tsx
// Text preset (type 필수 → withDefaults 실익)
export const Body2 = withDefaults(Text, { type: 'body2_600' }, 'Body2')
export const Body2Gray = withDefaults(
  Text,
  { type: 'body2_600', color: COLORS.GRAY_80 },
  'Body2Gray',
)
export const Heading1 = withDefaults(Text, { type: 'heading1_600' }, 'Heading1')

// Button preset (role 기반 명명)
export const AddButton = withDefaults(
  Button,
  { styleType: 'secondarySolid', size: 'small' },
  'AddButton',
)
export const SubmitButton = withDefaults(
  Button,
  { styleType: 'primarySolid', size: 'medium' },
  'SubmitButton',
)
export const DeleteButton = withDefaults(
  Button,
  { styleType: 'dangerSolid', size: 'small' },
  'DeleteButton',
)
```

render는 이렇게 깨끗해진다:

```tsx
<Body2Gray render={<LineClamp lines={2} />}>{name}</Body2Gray>
<AddButton onClick={handleAdd}>추가</AddButton>
```

---

## 6. 한 줄 요약

> preset 캡슐화 방향은 옳다. preset prop이 **옵셔널이면 plain wrapper**, **필수 + 다수 + 여러 컴포넌트면 `withDefaults`**.
> 이름은 **안정 축(scale/role)** 으로, 변하는 축(color)은 prop으로. 실사용 조합만 큐레이션.
> `prps`·`useProps`·className 미리조립은 base-ui `render`와 emotion 캐싱이 이미 해결하므로 불필요.
