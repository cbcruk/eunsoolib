import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PauseableTimer } from './pauseable-timer'

describe('PauseableTimer', () => {
  let onTick: ReturnType<typeof vi.fn>
  let onTimeout: ReturnType<typeof vi.fn>
  let timer: PauseableTimer

  beforeEach(() => {
    vi.useFakeTimers()

    onTick = vi.fn()
    onTimeout = vi.fn()

    timer = new PauseableTimer(5, onTick, onTimeout)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start 후 1초마다 tick이 호출된다', () => {
    timer.start()

    vi.advanceTimersByTime(3000)

    expect(onTick).toHaveBeenCalledTimes(3)
    expect(timer.getRemainingSeconds()).toBe(2)
  })

  it('pause 중에는 tick이 호출되지 않는다', () => {
    timer.start()
    vi.advanceTimersByTime(2000)
    timer.pause()
    vi.advanceTimersByTime(2000)

    expect(onTick).toHaveBeenCalledTimes(2)
    expect(timer.getRemainingSeconds()).toBe(3)
  })

  it('resume 하면 타이머가 다시 동작한다', () => {
    timer.start()
    timer.pause()
    timer.resume()

    vi.advanceTimersByTime(1000)

    expect(onTick).toHaveBeenCalledTimes(1)
  })

  it('시간이 다 되면 onTimeout이 호출된다', () => {
    timer.start()

    vi.advanceTimersByTime(6000)

    expect(onTimeout).toHaveBeenCalled()
    expect(timer.isTimeout()).toBe(true)
  })

  it('reset 하면 시간이 초기화된다', () => {
    timer.start()

    vi.advanceTimersByTime(2000)

    timer.reset()

    expect(timer.getRemainingSeconds()).toBe(5)
    expect(timer.isRunning()).toBe(false)
  })
})
