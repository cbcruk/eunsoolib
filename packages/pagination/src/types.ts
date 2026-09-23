/** 페이지 번호 목록의 한 칸. 페이지 번호이거나 생략 구간을 뜻하는 `'...'`. */
export type PaginationItem = number | '...'

/**
 * 페이지 번호 목록을 만드는 방식.
 *
 * - `'window'`: 현재 페이지 주변과 양 끝을 남기고 나머지를 `'...'`로 접는다.
 *   첫·마지막 페이지가 항상 보인다.
 * - `'block'`: 현재 페이지가 속한 구간(1~10, 11~20)만 보여 주고 `'...'`는 쓰지 않는다.
 *   첫·마지막 페이지가 목록에 없을 수 있으므로 `goToFirst`·`goToLast`와 함께 쓴다.
 */
export type PaginationMode = 'window' | 'block'

/**
 * {@link usePagination}이 반환하는 pagination 상태와 조작 함수 묶음.
 *
 * 같은 인스턴스를 여러 UI에 props로 넘기면 상태가 공유된다.
 */
export interface PaginationInstance {
  /**
   * 현재 페이지 (1-based).
   *
   * 항상 `1`~`totalPages` 안의 값이다. `total`·`pageSize`가 줄어 기억한 페이지가 범위를
   * 벗어나면 마지막 페이지로 보정해 보여 주고, 다시 늘어나면 기억한 페이지로 돌아간다.
   */
  page: number
  /** 페이지당 항목 수 */
  pageSize: number
  /** 전체 항목 수 */
  total: number
  /** 전체 페이지 수 */
  totalPages: number
  /**
   * 렌더링용 페이지 번호 배열.
   *
   * `mode`가 `'window'`면 접힌 구간이 `'...'`로 들어가고, `'block'`이면 번호만 들어간다.
   */
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
  /** 첫 페이지로 이동한다. */
  goToFirst: () => void
  /** 마지막 페이지로 이동한다. */
  goToLast: () => void
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
  /** 페이지 번호 목록을 만드는 방식 @default 'window' */
  mode?: PaginationMode
  /** 현재 페이지 양옆에 표시할 페이지 수. `mode`가 `'window'`일 때만 쓴다. @default 1 */
  siblingCount?: number
  /** 양 끝에 표시할 페이지 수. `mode`가 `'window'`일 때만 쓴다. @default 1 */
  boundaryCount?: number
  /** 한 구간에 표시할 페이지 수. `mode`가 `'block'`일 때만 쓴다. @default 10 */
  blockSize?: number
  /**
   * `goTo`·`next`·`prev`·`setPageSize`로 페이지가 실제로 바뀌었을 때 새 페이지로 호출된다.
   *
   * 마지막 페이지에서 `next()`를 부르는 등 페이지가 그대로면 호출하지 않는다.
   * `total`·`pageSize` 변화로 표시 페이지가 보정될 때도 호출하지 않는다.
   */
  onChange?: (page: number) => void
  /** 기존 인스턴스 재사용 (Instance Hook Pattern의 핵심) */
  pagination?: PaginationInstance
}

/**
 * {@link Pagination} 컴포넌트의 props.
 *
 * `pagination`을 넘기지 않으면 나머지 {@link UsePaginationOptions}(`total` 등)로
 * 컴포넌트가 인스턴스를 직접 만든다. `pagination`을 넘기면 그 옵션들은 무시된다.
 */
export interface PaginationProps extends Omit<
  UsePaginationOptions,
  'pagination'
> {
  /** 외부에서 생성한 인스턴스. 미전달 시 나머지 옵션으로 컴포넌트가 자체 생성한다. */
  pagination?: PaginationInstance
  /** 전체 항목 수와 현재 항목 범위 안내 문구를 표시할지 여부 @default false */
  showInfo?: boolean
  /**
   * 첫·마지막 페이지로 가는 버튼을 표시할지 여부.
   *
   * `mode`가 `'block'`이면 첫·마지막 페이지가 목록에 없을 수 있으므로 켜는 것이 좋다.
   *
   * @default false
   */
  showEdges?: boolean
  /** 버튼 크기 @default 'md' */
  size?: 'sm' | 'md'
  /** 최상위 요소에 붙일 class 이름 @default '' */
  className?: string
}
