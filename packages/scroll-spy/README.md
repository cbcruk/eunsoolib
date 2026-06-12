# @eunsoolib/scroll-spy

Progressive enhancement 기반의 모던 scroll-spy 라이브러리입니다.

- 🚀 **네이티브 CSS** `scroll-target-group` + `:target-current` (Chrome 140+)
- 🔧 미지원 브라우저를 위한 **IntersectionObserver** 폴백
- ⚛️ **React 훅·컴포넌트** 포함 (`@eunsoolib/scroll-spy/react`)
- 📦 코어는 **의존성 없음** (훅 사용 시에만 react peer 의존)

## 설치

```bash
pnpm add @eunsoolib/scroll-spy
```

## Progressive Enhancement

`CSS.supports('scroll-target-group', 'auto')`로 기능을 감지해 자동으로 최적 구현을 고릅니다.

```
CSS.supports('scroll-target-group')
        │
   ┌────┴────┐
  ✅ Yes    ❌ No
   │         │
 네이티브   IntersectionObserver
 CSS        폴백
```

## 사용법

### 순수 CSS (Chrome 140+)

네이티브 CSS만으로도 JavaScript 없이 동작합니다.

```html
<nav class="toc">
  <a href="#intro">Introduction</a>
  <a href="#features">Features</a>
</nav>

<style>
  .toc {
    scroll-target-group: auto;
  }
  .toc a:target-current {
    color: var(--accent);
  }
</style>
```

### Vanilla JavaScript (폴백 포함)

```typescript
import { createScrollSpy } from '@eunsoolib/scroll-spy'

const nav = document.querySelector('.toc') as HTMLElement
const spy = createScrollSpy(nav, {
  activeClass: 'active',
  rootMargin: '0px 0px -50% 0px',
  onChange: (id) => console.log(`Now viewing: ${id}`),
})

console.log(spy.isNative) // Chrome 140+에서 true
spy.destroy()
```

### React 훅

```tsx
import { useScrollSpyHeadings, ScrollSpyNav } from '@eunsoolib/scroll-spy/react'

function Toc() {
  const { headings, currentId, navRef } = useScrollSpyHeadings({
    selector: 'h2, h3',
  })

  return <ScrollSpyNav ref={navRef} headings={headings} currentId={currentId} />
}
```

부드러운 스크롤을 더하려면 `useSmoothScroll`을 조합합니다.

```tsx
import {
  useScrollSpyHeadings,
  useSmoothScroll,
} from '@eunsoolib/scroll-spy/react'

function Toc() {
  const { headings, currentId, navRef } = useScrollSpyHeadings()
  const { handleClick } = useSmoothScroll({ offset: 80 })

  return (
    <nav ref={navRef}>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={h.id === currentId ? 'active' : ''}
          onClick={handleClick}
        >
          {h.text}
        </a>
      ))}
    </nav>
  )
}
```

## API

### 코어 (`@eunsoolib/scroll-spy`)

| 함수                            | 설명                                               |
| ------------------------------- | -------------------------------------------------- |
| `createScrollSpy(el, options?)` | scroll-spy 인스턴스 생성 (네이티브/폴백 자동 선택) |
| `supportsScrollTargetGroup()`   | 네이티브 CSS 지원 여부                             |
| `generateToc(options?)`         | 헤딩에서 목차 `<nav>` 자동 생성                    |
| `generateStyles(options?)`      | progressive enhancement용 CSS 문자열 생성          |

#### `createScrollSpy` 옵션

| Option             | Type                    | Default              |
| ------------------ | ----------------------- | -------------------- |
| `root`             | `Element \| null`       | `null`               |
| `rootMargin`       | `string`                | `'0px 0px -50% 0px'` |
| `threshold`        | `number \| number[]`    | `0`                  |
| `activeClass`      | `string`                | `'active'`           |
| `currentAttribute` | `string`                | `'data-current'`     |
| `onChange`         | `(id, element) => void` | -                    |

#### `ScrollSpyInstance`

| Property    | Type             | 설명                   |
| ----------- | ---------------- | ---------------------- |
| `currentId` | `string \| null` | 현재 활성 섹션 ID      |
| `isNative`  | `boolean`        | 네이티브 CSS 사용 여부 |
| `setActive` | `(id) => void`   | 수동으로 활성 지정     |
| `refresh`   | `() => void`     | 타깃 재관찰            |
| `destroy`   | `() => void`     | 인스턴스 정리          |

### React (`@eunsoolib/scroll-spy/react`)

| 항목                   | 설명                                          |
| ---------------------- | --------------------------------------------- |
| `useScrollSpy`         | nav ref + 현재 활성 ID                        |
| `useScrollSpyHeadings` | 컨테이너에서 헤딩 자동 수집 + scroll-spy 연동 |
| `useIsNativeScrollSpy` | 네이티브 지원 여부 (SSR 안전)                 |
| `useSmoothScroll`      | 앵커 클릭 시 offset 포함 부드러운 스크롤      |
| `<ScrollSpyNav>`       | 헤딩 목록 렌더링 컴포넌트                     |
| `<ScrollSpy>`          | 헤딩 수집 + 렌더까지 묶은 컴포넌트            |

## 브라우저 지원

| Browser     | Mode        |
| ----------- | ----------- |
| Chrome 140+ | Native CSS  |
| Edge 140+   | Native CSS  |
| Firefox     | JS Fallback |
| Safari      | JS Fallback |

## 참고

[Una Kravets의 CSS scroll-spy 글](https://una.im/scroll-target-group/)에서 영감을 받았습니다.

## 라이선스

MIT
