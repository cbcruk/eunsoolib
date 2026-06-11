import { useCallback, useMemo, useState } from "react";
import { getPaginationRange } from "./pagination.utils";
import type { PaginationInstance, UsePaginationOptions } from "./types";

/**
 * Instance Hook Pattern으로 동작하는 pagination 훅.
 *
 * 하나의 인스턴스를 여러 UI(테이블 위/아래 등)가 props로 공유하면 Provider
 * 없이도 상태가 동기화된다. 기존 인스턴스를 `pagination`으로 주입하면 그대로
 * 반환한다.
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
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goTo = useCallback(
    (p: number) => {
      const clamped = Math.max(
        1,
        Math.min(p, Math.max(1, Math.ceil(total / pageSize)))
      );
      setPage(clamped);
      onChange?.(clamped);
    },
    [total, pageSize, onChange]
  );

  const next = useCallback(() => goTo(page + 1), [goTo, page]);
  const prev = useCallback(() => goTo(page - 1), [goTo, page]);

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setPage(1);
      onChange?.(1);
    },
    [onChange]
  );

  return useMemo<PaginationInstance>(() => {
    if (pagination) return pagination;

    const items = getPaginationRange({
      page,
      totalPages,
      siblingCount,
      boundaryCount,
    });
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

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
    };
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
  ]);
}
