import type { PaginationItem } from './types'

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

/**
 * 표시할 페이지 번호 배열을 계산한다. gap이 생기면 DOTS("...")를 삽입한다.
 *
 * - `totalPages`가 충분히 작으면 전부 표시한다.
 * - 양 끝 `boundaryCount`개와 현재 페이지 주변 `siblingCount`개를 남기고
 *   나머지 구간은 DOTS로 접는다.
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
