import { act, renderHook } from '@testing-library/react'
import { useDelayedFlag } from './use-delayed-flag'

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('처음에는 false여야 함', () => {
    const { result } = renderHook(() => useDelayedFlag(true))

    expect(result.current).toBe(false)
  })

  it('delay가 지나면 true가 되어야 함', () => {
    const { result } = renderHook(() => useDelayedFlag(true, { delay: 300 }))

    act(() => void vi.advanceTimersByTime(299))
    expect(result.current).toBe(false)

    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('delay 이전에 끝나면 한 번도 true가 되지 않아야 함', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedFlag(active, { delay: 200 }),
      { initialProps: { active: true } },
    )

    act(() => void vi.advanceTimersByTime(100))
    rerender({ active: false })
    act(() => void vi.advanceTimersByTime(1000))

    expect(result.current).toBe(false)
  })

  it('한 번 보이면 minDuration 동안 유지해야 함', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedFlag(active, { delay: 200, minDuration: 400 }),
      { initialProps: { active: true } },
    )

    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe(true)

    rerender({ active: false })
    act(() => void vi.advanceTimersByTime(399))
    expect(result.current).toBe(true)

    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe(false)
  })

  it('minDuration을 이미 넘겼으면 즉시 꺼져야 함', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedFlag(active, { delay: 200, minDuration: 400 }),
      { initialProps: { active: true } },
    )

    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current).toBe(true)

    act(() => rerender({ active: false }))
    expect(result.current).toBe(false)
  })

  it('유지 중에 active가 다시 켜지면 재진입하지 않고 계속 보여야 함', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedFlag(active, { delay: 200, minDuration: 400 }),
      { initialProps: { active: true } },
    )

    act(() => void vi.advanceTimersByTime(200))
    rerender({ active: false })
    act(() => void vi.advanceTimersByTime(100))
    rerender({ active: true })
    act(() => void vi.advanceTimersByTime(1000))

    expect(result.current).toBe(true)
  })
})
