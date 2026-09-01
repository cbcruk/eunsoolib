import { act, renderHook } from '@testing-library/react'
import { useElapsed } from './use-elapsed'

describe('useElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('active가 false면 0을 유지해야 함', () => {
    const { result } = renderHook(() => useElapsed(false))

    act(() => void vi.advanceTimersByTime(5000))

    expect(result.current).toBe(0)
  })

  it('tick 간격으로 경과 시간을 갱신해야 함', () => {
    const { result } = renderHook(() => useElapsed(true, 1000))

    expect(result.current).toBe(0)

    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current).toBe(1000)

    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current).toBe(3000)
  })

  it('tick 사이에는 갱신하지 않아야 함', () => {
    const { result } = renderHook(() => useElapsed(true, 1000))

    act(() => void vi.advanceTimersByTime(999))

    expect(result.current).toBe(0)
  })

  it('active가 꺼지면 0으로 되돌리고 타이머를 멈춰야 함', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useElapsed(active),
      {
        initialProps: { active: true },
      },
    )

    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current).toBe(2000)

    act(() => rerender({ active: false }))
    expect(result.current).toBe(0)

    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current).toBe(0)
  })
})
