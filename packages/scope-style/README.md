# @cbcruk/scope-style

네이티브 CSS `@scope` + `@layer`로 **일반 CSS**를 컴포넌트 서브트리에만 적용합니다.

빌드 단계도, 클래스명 조작도, 런타임 CSS 파서도 없습니다. 평범한 CSS를 쓰면 라이브러리가
그 CSS가 컴포넌트 자신의 DOM에만 닿도록 감싸 줍니다.

## 설치

```bash
pnpm add @cbcruk/scope-style react
```

브라우저의 네이티브 CSS `@scope` 지원이 필요합니다(아래 [브라우저 지원](#브라우저-지원) 참고).

## 사용법

```tsx
import { useScopedStyle } from '@cbcruk/scope-style'

function Card({ children }: { children?: React.ReactNode }) {
  const scope = useScopedStyle(
    `
    :scope  { display: grid; gap: 8px; padding: 16px; border: 1px solid #ddd; }
    .title  { font-weight: 700; }
    p       { color: crimson; }
    `,
    { layer: 'components' },
  )

  return (
    <article {...scope}>
      <h2 className="title">Title</h2>
      <p>이 문단은 빨간색입니다.</p>
      {children}
    </article>
  )
}
```

### SSR / React 19: `ScopedStyle` + `scopeFor`

훅은 insertion effect에서 스타일을 주입하는데, 이 effect는 SSR 중에 실행되지 않습니다. 서버
렌더링에서는 실제 `<style>` 요소를 렌더하고 결정적인 `scopeFor` 헬퍼와 함께 씁니다.

```tsx
import { ScopedStyle, scopeFor } from '@cbcruk/scope-style'

const css = `:scope { padding: 16px } p { color: crimson }`

function Card() {
  const { props } = scopeFor(css, { layer: 'components' })
  return (
    <article {...props}>
      <ScopedStyle css={css} layer="components" />
      <p>스코프가 적용되고, 서버에서 렌더됩니다.</p>
    </article>
  )
}
```

React 19에서 `<ScopedStyle>`은 `<style href precedence>`를 내보내고, React가 이를 `<head>`로
끌어올리며 중복을 자동으로 제거합니다(스트리밍 SSR에서도 동작). React 18에서는 인라인으로
렌더되지만, 스코프가 위치가 아니라 셀렉터 기반이라 그대로 동작합니다.

## API

### `useScopedStyle(css, options?) => { "data-scope": string }`

클라이언트 훅. 공유·참조 카운트되는 `<style>` 하나를 `<head>`에 주입하고(마운트 시 추가, 마지막
인스턴스 언마운트 시 제거) 스코프 루트에 펼칠 props를 반환합니다. id는 CSS의 안정적인 해시라서
같은 컴포넌트의 모든 인스턴스가 `<style>` 노드 하나를 공유합니다.

### `scopeFor(css, options?) => { props, id, css }`

아무것도 주입하지 않고 스코프를 계산하는 순수 함수. 같은 CSS·옵션이면 서버와 클라이언트에서 항상 같은
`id`가 나오므로 hydration에 안전합니다. `props`는 스코프 루트에 펼칠 `{ "data-scope": id }`, `css`는
`@scope`(+ `@layer`)로 감싼 결과 CSS입니다.

### `<ScopedStyle css {...options} precedence? />`

SSR에서도 렌더되는 `<style>` 요소. `scopeFor`와 같은 옵션을 받고, `precedence` 기본값은 `'scoped'`입니다.

### `options`

| 옵션         | 타입                | 기본값 | 설명                                                                                      |
| ------------ | ------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `donut`      | `boolean \| string` | `true` | `true` → 중첩된 스코프에서 멈춤. `string` → 직접 지정한 경계 셀렉터. `false` → 경계 없음  |
| `layer`      | `string`            | —      | 규칙을 `@layer <name>`으로 감싸 덮어쓰기 순서를 예측 가능하게 함                          |
| `scopeNames` | `boolean`           | `true` | `@keyframes` 이름과 `animation`/`animation-name` 참조에 스코프 id 접미사를 붙여 충돌 방지 |

## 설계 노트

### 셀렉터 앞에 id를 붙이면 되지 않나?

흔한 패턴(React의 `<style>` 문서 예시 등)은 `useId()` + `#id .foo`입니다. 이는 자손 결합자라서
`#id .foo`가 **중첩된 자식 컴포넌트** 안의 `.foo`에도 매칭되고, 스타일이 아래로 새어 나갑니다.

`scope-style`은 `@scope (root) to ([data-scope])`를 씁니다. `to (...)` 하한 경계가 **도넛**을 만들어,
스타일은 내 서브트리에 적용되되 자기 스코프를 가진 중첩 요소에서 멈춥니다. 이 라이브러리로
스타일링한 자식은 자기 모양을 그대로 유지합니다. 셀렉터 접두사로는 깔끔하게 표현할 수 없는 부분이
이 경계이고, React 내부(fiber)를 들여다보는 방식이 맞지 않는 이유이기도 합니다. 경계는 reconciler가
아니라 CSS cascade에 있습니다.

### 작성 시 참고

- 셀렉터는 스코프 루트 기준 상대 경로입니다. 루트 요소는 `:scope`로 지정합니다.
- 네이티브 중첩, `&`, `@media`, `:hover`, 커스텀 프로퍼티는 모두 그대로 동작합니다.
- `@scope` 안에 선언한 이름 정의 at-rule은 스펙상 **전역**입니다. `@keyframes`는 `scopeNames`(기본
  `true`)가 스코프별 이름으로 바꿔 주지만, `@font-face` / `@property` / `@counter-style`은 의도적으로
  그대로 두고 개발 모드에서 경고만 출력합니다. 이 셋은 이름을 고유하게 지으세요.

### 브라우저 지원

네이티브 CSS `@scope`가 필요합니다. Baseline Newly Available입니다(Chrome/Safari는 2024년부터,
Firefox는 2025년 12월 146부터). 더 오래된 환경을 지원해야 하면 `@supports at-rule(@scope) { ... }`로
분기하거나 빌드 타임 방식으로 대체하세요.
