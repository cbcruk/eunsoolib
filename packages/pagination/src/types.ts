/** 페이지 번호 목록의 한 칸. 페이지 번호이거나 생략 구간을 뜻하는 `'...'`. */
export type PaginationItem = number | '...'

/**
 * {@link usePagination}이 반환하는 pagination 상태와 조작 함수 묶음.
 *
 * 같은 인스턴스를 여러 UI에 props로 넘기면 상태가 공유된다.
 */
export interface PaginationInstance {
  /** 현재 페이지 (1-based) */
  page: number
  /** 페이지당 항목 수 */
  pageSize: number
  /** 전체 항목 수 */
  total: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 렌더링용 페이지 번호 배열 (gap은 "..."로 표시) */
  items: PaginationItem[]
  /** 현재 페이지의 항목 범위 (1-based) */
  range: { start: number; end: number }
  /** 현재 페이지가 첫 페이지인지 여부 */
  isFirst: boolean
  /** 현재 페이지가 마지막 페이지인지 여부 */
  isLast: boolean
  /** 다음 페이지로 이동한다. 마지막 페이지에서는 그대로 머문다. */
  next: () => void
  /** 이전 페이지로 이동한다. 첫 페이지에서는 그대로 머문다. */
  prev: () => void
  /** 지정한 페이지로 이동한다. 범위를 벗어나면 `1`~`totalPages`로 clamp한다. */
  goTo: (page: number) => void
  /** 페이지당 항목 수를 바꾸고 첫 페이지로 되돌린다. */
  setPageSize: (size: number) => void
}

/** {@link usePagination}의 옵션. */
export interface UsePaginationOptions {
  /** 전체 항목 수 (보통 서버 응답에서 주입) @default 0 */
  total?: number
  /** 처음 표시할 페이지 (1-based). 마운트 시에만 읽는다. @default 1 */
  initialPage?: number
  /** 처음 페이지당 항목 수. 마운트 시에만 읽는다. @default 10 */
  initialPageSize?: number
  /** 현재 페이지 양옆에 표시할 페이지 수 @default 1 */
  siblingCount?: number
  /** 양 끝에 표시할 페이지 수 @default 1 */
  boundaryCount?: number
  /**
   * `goTo`·`next`·`prev`·`setPageSize`를 호출할 때마다 이동한 페이지로 호출된다.
   * 페이지가 그대로여도 호출되며, `setPageSize`는 `1`을 넘긴다.
   */
  onChange?: (page: number) => void
  /** 기존 인스턴스 재사용 (Instance Hook Pattern의 핵심) */
  pagination?: PaginationInstance
}

/** {@link Pagination} 컴포넌트의 props. */
export interface PaginationProps {
  /** 외부에서 생성한 인스턴스. 미전달 시 컴포넌트가 자체 생성한다. */
  pagination?: PaginationInstance
  /** 전체 항목 수와 현재 항목 범위 안내 문구를 표시할지 여부 @default false */
  showInfo?: boolean
  /** 버튼 크기 @default 'md' */
  size?: 'sm' | 'md'
  /** 최상위 요소에 붙일 class 이름 @default '' */
  className?: string
}
