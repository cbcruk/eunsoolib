import { useCallback, useMemo, useState } from 'react'
import { getPaginationRange } from './pagination.utils'
import type { PaginationInstance, UsePaginationOptions } from './types'

const clamp = (page: number, totalPages: number) =>
  Math.max(1, Math.min(page, totalPages))

/**
 * Instance Hook Pattern으로 동작하는 pagination 훅.
 *
 * 하나의 인스턴스를 여러 UI(테이블 위/아래 등)가 props로 공유하면 Provider
 * 없이도 상태가 동기화된다. 기존 인스턴스를 `pagination`으로 주입하면 그대로
 * 반환한다.
 *
 * 반환하는 `page`는 렌더링마다 `1`~`totalPages`로 clamp한다. 서버 응답을 기다리는 동안
 * `total`이 잠시 `0`이 되어도 기억한 페이지를 잃지 않도록 내부 상태는 바꾸지 않는다.
 * `onChange`는 페이지가 실제로 바뀔 때만 호출한다.
 *
 * @example
 * ```tsx
 * import { Pagination, usePagination } from '@cbcruk/pagination'
 *
 * function List({ total }: { total: number }) {
 *   const pagination = usePagination({
 *     total,
 *     initialPageSize: 20,
 *     onChange: (page) => console.log(page),
 *   })
 *   return <Pagination pagination={pagination} showInfo />
 * }
 * ```
 */
export function usePagination({
  total = 0,
  initialPage = 1,
  initialPageSize = 10,
  siblingCount = 1,
  boundaryCount = 1,
  onChange,
  pagination,
}: UsePaginationOptions = {}): PaginationInstance {
  const [pageState, setPage] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = clamp(pageState, totalPages)

  const goTo = useCallback(
    (p: number) => {
      const clamped = clamp(p, totalPages)

      setPage(clamped)

      if (clamped !== page) {
        onChange?.(clamped)
      }
    },
    [totalPages, page, onChange],
  )

  const next = useCallback(() => goTo(page + 1), [goTo, page])
  const prev = useCallback(() => goTo(page - 1), [goTo, page])

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size)
      setPage(1)

      if (page !== 1) {
        onChange?.(1)
      }
    },
    [page, onChange],
  )

  return useMemo<PaginationInstance>(() => {
    if (pagination) return pagination

    const items = getPaginationRange({
      page,
      totalPages,
      siblingCount,
      boundaryCount,
    })
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)

    return {
      page,
      pageSize,
      total,
      totalPages,
      items,
      range: { start, end },
      isFirst: page === 1,
      isLast: page === totalPages,
      next,
      prev,
      goTo,
      setPageSize,
    }
  }, [
    pagination,
    page,
    pageSize,
    total,
    totalPages,
    siblingCount,
    boundaryCount,
    next,
    prev,
    goTo,
    setPageSize,
  ])
}
