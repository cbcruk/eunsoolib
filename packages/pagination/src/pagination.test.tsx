import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from '@testing-library/react'
import { getPaginationRange, DOTS } from './pagination.utils'
import { usePagination } from './use-pagination'
import { Pagination } from './pagination'

describe('getPaginationRange', () => {
  it('전체 페이지가 적으면 전부 표시해야 함', () => {
    expect(getPaginationRange({ page: 1, totalPages: 5 })).toEqual([
      1, 2, 3, 4, 5,
    ])
  })

  it('첫 페이지 근처에서는 오른쪽에만 DOTS를 넣어야 함', () => {
    expect(getPaginationRange({ page: 1, totalPages: 10 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      DOTS,
      10,
    ])
  })

  it('마지막 페이지 근처에서는 왼쪽에만 DOTS를 넣어야 함', () => {
    expect(getPaginationRange({ page: 10, totalPages: 10 })).toEqual([
      1,
      DOTS,
      6,
      7,
      8,
      9,
      10,
    ])
  })

  it('중간 페이지에서는 양쪽에 DOTS를 넣어야 함', () => {
    expect(getPaginationRange({ page: 5, totalPages: 10 })).toEqual([
      1,
      DOTS,
      4,
      5,
      6,
      DOTS,
      10,
    ])
  })

  it('siblingCount를 늘리면 현재 페이지 주변을 더 넓게 표시해야 함', () => {
    expect(
      getPaginationRange({ page: 6, totalPages: 12, siblingCount: 2 }),
    ).toEqual([1, DOTS, 4, 5, 6, 7, 8, DOTS, 12])
  })
})

describe('usePagination', () => {
  it('total과 pageSize로 totalPages/range를 계산해야 함', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 95, initialPageSize: 10 }),
    )

    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(10)
    expect(result.current.range).toEqual({ start: 1, end: 10 })
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
  })

  it('next/prev로 페이지를 이동해야 함', () => {
    const { result } = renderHook(() => usePagination({ total: 95 }))

    act(() => result.current.next())
    expect(result.current.page).toBe(2)

    act(() => result.current.prev())
    expect(result.current.page).toBe(1)
  })

  it('goTo는 1과 totalPages 사이로 clamp해야 함', () => {
    const { result } = renderHook(() => usePagination({ total: 95 }))

    act(() => result.current.goTo(999))
    expect(result.current.page).toBe(10)

    act(() => result.current.goTo(-5))
    expect(result.current.page).toBe(1)
  })

  it('마지막 페이지의 range는 total로 끝나야 함', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 95, initialPageSize: 10 }),
    )

    act(() => result.current.goTo(10))
    expect(result.current.range).toEqual({ start: 91, end: 95 })
    expect(result.current.isLast).toBe(true)
  })

  it('setPageSize는 첫 페이지로 되돌리고 totalPages를 다시 계산해야 함', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 95, initialPageSize: 10 }),
    )

    act(() => result.current.goTo(5))
    act(() => result.current.setPageSize(20))

    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(5)
  })

  it('total이 0이면 totalPages는 1, range는 0으로 처리해야 함', () => {
    const { result } = renderHook(() => usePagination({ total: 0 }))

    expect(result.current.totalPages).toBe(1)
    expect(result.current.range).toEqual({ start: 0, end: 0 })
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(true)
  })

  it('페이지 변경 시 onChange를 호출해야 함', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => usePagination({ total: 95, onChange }))

    act(() => result.current.goTo(3))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('페이지가 바뀌지 않으면 onChange를 호출하지 않아야 함', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => usePagination({ total: 95, onChange }))

    act(() => result.current.prev())
    act(() => result.current.goTo(1))
    act(() => result.current.setPageSize(20))
    expect(onChange).not.toHaveBeenCalled()

    act(() => result.current.goTo(5))
    act(() => result.current.next())
    act(() => result.current.goTo(999))
    expect(onChange.mock.calls).toEqual([[5]])
  })

  it('setPageSize는 첫 페이지가 아닐 때만 onChange(1)을 호출해야 함', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      usePagination({ total: 95, initialPage: 3, onChange }),
    )

    act(() => result.current.setPageSize(20))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('total이 줄면 page를 totalPages 안으로 보정해야 함', () => {
    const { result, rerender } = renderHook(
      ({ total }) => usePagination({ total, initialPageSize: 10 }),
      { initialProps: { total: 95 } },
    )

    act(() => result.current.goTo(5))
    rerender({ total: 8 })

    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.range).toEqual({ start: 1, end: 8 })
    expect(result.current.isLast).toBe(true)
    expect(result.current.items).toEqual([1])
  })

  it('보정된 page에서 prev/next가 보정된 값을 기준으로 동작해야 함', () => {
    const { result, rerender } = renderHook(
      ({ total }) => usePagination({ total, initialPageSize: 10 }),
      { initialProps: { total: 95 } },
    )

    act(() => result.current.goTo(9))
    rerender({ total: 30 })
    expect(result.current.page).toBe(3)

    act(() => result.current.prev())
    expect(result.current.page).toBe(2)
  })

  it('total이 잠시 0이 되었다가 돌아오면 기억한 page를 유지해야 함', () => {
    const { result, rerender } = renderHook(
      ({ total }) => usePagination({ total, initialPageSize: 10 }),
      { initialProps: { total: 95 } },
    )

    act(() => result.current.goTo(5))
    rerender({ total: 0 })
    expect(result.current.page).toBe(1)

    rerender({ total: 95 })
    expect(result.current.page).toBe(5)
  })

  it('범위를 벗어난 initialPage도 clamp해야 함', () => {
    const { result } = renderHook(() =>
      usePagination({ total: 30, initialPage: 7 }),
    )

    expect(result.current.page).toBe(3)
    expect(result.current.isLast).toBe(true)
  })
})

describe('Pagination 컴포넌트', () => {
  function Harness(): React.ReactNode {
    const pagination = usePagination({ total: 95, initialPageSize: 10 })
    return <Pagination pagination={pagination} showInfo />
  }

  it("현재 페이지 버튼에 aria-current='page'를 표시해야 함", () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('첫 페이지에서는 이전 버튼이 비활성화되어야 함', () => {
    render(<Harness />)
    expect(screen.getByLabelText('이전 페이지')).toBeDisabled()
    expect(screen.getByLabelText('다음 페이지')).toBeEnabled()
  })

  it('페이지 번호를 클릭하면 해당 페이지로 이동해야 함', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: '2' }))

    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText(/11–20/)).toBeInTheDocument()
  })

  it('showInfo가 켜지면 항목 범위를 표시해야 함', () => {
    render(<Harness />)
    expect(screen.getByText(/1–10/)).toBeInTheDocument()
  })

  it('pagination 없이 total을 넘기면 자체 인스턴스로 여러 페이지를 표시해야 함', () => {
    const onChange = vi.fn()

    render(
      <Pagination
        total={95}
        initialPageSize={10}
        onChange={onChange}
        showInfo
      />,
    )

    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    expect(screen.getByText(/95/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('다음 페이지'))

    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
