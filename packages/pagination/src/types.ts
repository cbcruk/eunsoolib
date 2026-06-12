export type PaginationItem = number | '...'

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
  isFirst: boolean
  isLast: boolean
  next: () => void
  prev: () => void
  goTo: (page: number) => void
  setPageSize: (size: number) => void
}

export interface UsePaginationOptions {
  /** 전체 항목 수 (보통 서버 응답에서 주입) */
  total?: number
  initialPage?: number
  initialPageSize?: number
  /** 현재 페이지 양옆에 표시할 페이지 수 */
  siblingCount?: number
  /** 양 끝에 표시할 페이지 수 */
  boundaryCount?: number
  onChange?: (page: number) => void
  /** 기존 인스턴스 재사용 (Instance Hook Pattern의 핵심) */
  pagination?: PaginationInstance
}

export interface PaginationProps {
  /** 외부에서 생성한 인스턴스. 미전달 시 컴포넌트가 자체 생성한다. */
  pagination?: PaginationInstance
  showInfo?: boolean
  size?: 'sm' | 'md'
  className?: string
}
