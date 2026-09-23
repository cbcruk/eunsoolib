import type { PaginationItem } from './types'

/** 페이지 번호 목록에서 생략 구간을 나타내는 값. */
export const DOTS = '...' as const

export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export interface PaginationRangeParams {
  page: number
  totalPages: number
  siblingCount?: number
  boundaryCount?: number
}

export interface PaginationBlockParams {
  page: number
  totalPages: number
  blockSize?: number
}

/**
 * 현재 페이지가 속한 구간의 페이지 번호만 반환한다. DOTS를 쓰지 않는다.
 *
 * 페이지를 `blockSize`개씩 끊어 1~10, 11~20처럼 보여 주는 게시판형 UI용이다.
 * 첫·마지막 페이지가 목록에 없을 수 있으므로 `goToFirst`·`goToLast` 버튼과 함께 쓴다.
 *
 * @param params - 현재 페이지, 전체 페이지 수, 구간 크기
 * @returns 현재 구간의 페이지 번호 배열
 *
 * @example
 * ```ts
 * import { getPaginationBlock } from '@cbcruk/pagination'
 *
 * getPaginationBlock({ page: 12, totalPages: 12 })
 * // [11, 12]
 * ```
 */
export function getPaginationBlock({
  page,
  totalPages,
  blockSize = 10,
}: PaginationBlockParams): number[] {
  const lastPage = Math.max(1, totalPages)
  const size = Math.max(1, blockSize)
  const start = Math.floor((page - 1) / size) * size + 1

  return range(start, Math.min(start + size - 1, lastPage))
}

/**
 * 표시할 페이지 번호 배열을 계산한다. gap이 생기면 DOTS("...")를 삽입한다.
 *
 * - `totalPages`가 충분히 작으면 전부 표시한다.
 * - 양 끝 `boundaryCount`개와 현재 페이지 주변 `siblingCount`개를 남기고
 *   나머지 구간은 DOTS로 접는다.
 *
 * @example
 * ```ts
 * import { getPaginationRange } from '@cbcruk/pagination'
 *
 * getPaginationRange({ page: 5, totalPages: 10 })
 * // [1, '...', 4, 5, 6, '...', 10]
 * ```
 */
export function getPaginationRange({
  page,
  totalPages,
  siblingCount = 1,
  boundaryCount = 1,
}: PaginationRangeParams): PaginationItem[] {
  const totalNumbers = siblingCount * 2 + boundaryCount * 2 + 3
  if (totalNumbers >= totalPages) {
    return range(1, totalPages)
  }

  const leftSibling = Math.max(page - siblingCount, boundaryCount + 2)
  const rightSibling = Math.min(
    page + siblingCount,
    totalPages - boundaryCount - 1,
  )

  const showLeftDots = leftSibling > boundaryCount + 2
  const showRightDots = rightSibling < totalPages - boundaryCount - 1

  const startPages = range(1, boundaryCount)
  const endPages = range(totalPages - boundaryCount + 1, totalPages)

  if (!showLeftDots && showRightDots) {
    const leftCount = boundaryCount + siblingCount * 2 + 2
    return [...range(1, leftCount), DOTS, ...endPages]
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = boundaryCount + siblingCount * 2 + 2
    return [
      ...startPages,
      DOTS,
      ...range(totalPages - rightCount + 1, totalPages),
    ]
  }

  return [
    ...startPages,
    DOTS,
    ...range(leftSibling, rightSibling),
    DOTS,
    ...endPages,
  ]
}
