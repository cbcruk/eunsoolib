# @cbcruk/pagination

Instance Hook Pattern 기반의 React pagination 라이브러리입니다.

`usePagination`이 반환하는 **하나의 인스턴스**를 여러 UI(테이블 위/아래 등)가 props로 공유하면, Provider 없이도 상태가 동기화됩니다. ellipsis(`...`) 계산 같은 고유 복잡도는 인스턴스 안에 캡슐화됩니다.

## 설치

```bash
pnpm add @cbcruk/pagination
```

## 사용법

### 인스턴스를 공유하는 컴포넌트

```tsx
import { usePagination, Pagination } from '@cbcruk/pagination'

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

### 인스턴스 없이 컴포넌트만 쓰기

UI가 하나뿐이라 인스턴스를 공유할 필요가 없으면 `usePagination` 옵션을 `Pagination`에 바로
넘깁니다.

```tsx
import { Pagination } from '@cbcruk/pagination'

function Comments({ total, load }: Props) {
  return <Pagination total={total} initialPageSize={8} onChange={load} />
}
```

### 말줄임표 없이 10쪽씩 끊어 보여 주기

게시판처럼 `1 2 3 … 10` → `11 12 13 …` 식으로 구간을 끊어 넘기려면 `mode: 'block'`을
씁니다. 이때는 첫·마지막 페이지가 목록에 없을 수 있으므로 `showEdges`를 함께 켭니다.

```tsx
import { Pagination, usePagination } from '@cbcruk/pagination'

function Board({ total }: { total: number }) {
  const pagination = usePagination({ total, mode: 'block', blockSize: 10 })

  return <Pagination pagination={pagination} showEdges />
}
```

### 인스턴스 직접 제어

```tsx
pagination.next()
pagination.prev()
pagination.goTo(5) // 범위를 벗어나면 1~totalPages로 clamp
pagination.goToFirst()
pagination.goToLast()
pagination.setPageSize(20) // 첫 페이지로 리셋

pagination.page // 현재 페이지 (항상 1~totalPages)
pagination.totalPages // 전체 페이지 수
pagination.range // { start, end } (1-based)
pagination.items // 렌더링용 번호 배열 (window 모드에서 gap은 "...")
pagination.isFirst / pagination.isLast
```

## API

### `usePagination(options?)`

| Option            | Type                     | Default    | Description                            |
| ----------------- | ------------------------ | ---------- | -------------------------------------- |
| `total`           | `number`                 | `0`        | 전체 항목 수 (보통 서버 응답에서 주입) |
| `initialPage`     | `number`                 | `1`        | 초기 페이지                            |
| `initialPageSize` | `number`                 | `10`       | 페이지당 항목 수                       |
| `mode`            | `"window" \| "block"`    | `"window"` | 번호 목록을 만드는 방식                |
| `siblingCount`    | `number`                 | `1`        | 현재 페이지 양옆 표시 수 (window)      |
| `boundaryCount`   | `number`                 | `1`        | 양 끝 표시 수 (window)                 |
| `blockSize`       | `number`                 | `10`       | 한 구간의 페이지 수 (block)            |
| `onChange`        | `(page: number) => void` | -          | 페이지가 실제로 바뀌었을 때 호출       |
| `pagination`      | `PaginationInstance`     | -          | 기존 인스턴스 재사용                   |

`PaginationInstance`를 반환합니다.

- `page`는 렌더링마다 `1`~`totalPages`로 clamp됩니다. 5페이지에서 필터로 결과가 1페이지로
  줄면 `page`는 `1`, `range`·`isLast`도 그에 맞춰 계산됩니다. 내부에 기억한 페이지는 바꾸지
  않으므로, 로딩 중 `total`이 잠시 `0`이 됐다가 돌아오면 원래 페이지로 복귀합니다.
- `onChange`는 `goTo`·`next`·`prev`·`setPageSize`로 페이지가 **실제로 바뀔 때만**
  호출됩니다. 마지막 페이지에서 `next()`처럼 제자리면 호출하지 않고, 위의 clamp 보정에도
  호출하지 않습니다.

### `<Pagination />`

| Prop         | Type                 | Default | Description                |
| ------------ | -------------------- | ------- | -------------------------- |
| `pagination` | `PaginationInstance` | -       | 공유할 인스턴스            |
| `showInfo`   | `boolean`            | `false` | "전체 N개 중 a–b" 표시     |
| `showEdges`  | `boolean`            | `false` | 첫·마지막 페이지 버튼 표시 |
| `size`       | `"sm" \| "md"`       | `"md"`  | 버튼 크기                  |
| `className`  | `string`             | `""`    | 래퍼 className             |

`pagination`을 넘기지 않으면 `usePagination`의 나머지 옵션(`total`, `initialPage`,
`initialPageSize`, `mode`, `siblingCount`, `boundaryCount`, `blockSize`, `onChange`)을
prop으로 받아 자체 인스턴스를 만듭니다. `pagination`을 넘기면 이 옵션들은 무시됩니다.

### `getPaginationRange(params)`

페이지 번호 배열(ellipsis 포함)을 계산하는 순수 함수입니다. 커스텀 UI를 직접 만들 때 사용합니다.

```ts
getPaginationRange({ page: 5, totalPages: 10 })
// [1, "...", 4, 5, 6, "...", 10]
```

### `getPaginationBlock(params)`

현재 페이지가 속한 구간의 번호만 계산하는 순수 함수입니다. `'...'`를 쓰지 않습니다.

```ts
getPaginationBlock({ page: 12, totalPages: 12 })
// [11, 12]

getPaginationBlock({ page: 7, totalPages: 20, blockSize: 5 })
// [6, 7, 8, 9, 10]
```

## 두 가지 모드

|                   | `window` (기본)                            | `block`                                |
| ----------------- | ------------------------------------------ | -------------------------------------- |
| 12쪽 중 12쪽일 때 | `[1, '...', 11, 12]`                       | `[11, 12]`                             |
| 첫·마지막 페이지  | 항상 목록에 보임                           | 구간 밖이면 안 보임 → `showEdges` 필요 |
| 어울리는 UI       | 관리자 테이블처럼 양 끝으로 자주 뛰는 화면 | 게시판처럼 구간 단위로 넘기는 화면     |

`total`·`pageSize`는 **항목 수** 기준이고 `blockSize`는 **페이지 수** 기준이라
서로 독립적입니다. 한 페이지에 20개씩 담으면서 페이지 버튼은 10개만 노출할 수 있습니다.
