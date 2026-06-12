# @eunsoolib/pagination

Instance Hook Pattern 기반의 React pagination 라이브러리입니다.

`usePagination`이 반환하는 **하나의 인스턴스**를 여러 UI(테이블 위/아래 등)가 props로 공유하면, Provider 없이도 상태가 동기화됩니다. ellipsis(`...`) 계산 같은 고유 복잡도는 인스턴스 안에 캡슐화됩니다.

## 설치

```bash
pnpm add @eunsoolib/pagination
```

## 사용법

### 인스턴스를 공유하는 컴포넌트

```tsx
import { usePagination, Pagination } from '@eunsoolib/pagination'

function ProductTable({ total }: { total: number }) {
  const pagination = usePagination({ total, initialPageSize: 8 })

  const start = (pagination.page - 1) * pagination.pageSize
  const pageData = data.slice(start, start + pagination.pageSize)

  return (
    <>
      {/* 같은 인스턴스를 위·아래에서 공유 → 자동 동기화 */}
      <Pagination pagination={pagination} size="sm" showInfo />
      <Table rows={pageData} />
      <Pagination pagination={pagination} />
    </>
  )
}
```

### 인스턴스 직접 제어

```tsx
pagination.next()
pagination.prev()
pagination.goTo(5) // 범위를 벗어나면 1~totalPages로 clamp
pagination.setPageSize(20) // 첫 페이지로 리셋

pagination.page // 현재 페이지
pagination.totalPages // 전체 페이지 수
pagination.range // { start, end } (1-based)
pagination.items // 렌더링용 번호 배열 (gap은 "...")
pagination.isFirst / pagination.isLast
```

## API

### `usePagination(options?)`

| Option            | Type                     | Default | Description                            |
| ----------------- | ------------------------ | ------- | -------------------------------------- |
| `total`           | `number`                 | `0`     | 전체 항목 수 (보통 서버 응답에서 주입) |
| `initialPage`     | `number`                 | `1`     | 초기 페이지                            |
| `initialPageSize` | `number`                 | `10`    | 페이지당 항목 수                       |
| `siblingCount`    | `number`                 | `1`     | 현재 페이지 양옆 표시 수               |
| `boundaryCount`   | `number`                 | `1`     | 양 끝 표시 수                          |
| `onChange`        | `(page: number) => void` | -       | 페이지 변경 콜백                       |
| `pagination`      | `PaginationInstance`     | -       | 기존 인스턴스 재사용                   |

`PaginationInstance`를 반환합니다.

### `<Pagination />`

| Prop         | Type                 | Default | Description            |
| ------------ | -------------------- | ------- | ---------------------- |
| `pagination` | `PaginationInstance` | -       | 공유할 인스턴스        |
| `showInfo`   | `boolean`            | `false` | "전체 N개 중 a–b" 표시 |
| `size`       | `"sm" \| "md"`       | `"md"`  | 버튼 크기              |
| `className`  | `string`             | `""`    | 래퍼 className         |

### `getPaginationRange(params)`

페이지 번호 배열(ellipsis 포함)을 계산하는 순수 함수입니다. 커스텀 UI를 직접 만들 때 사용합니다.

```ts
getPaginationRange({ page: 5, totalPages: 10 })
// [1, "...", 4, 5, 6, "...", 10]
```

## 라이선스

MIT
