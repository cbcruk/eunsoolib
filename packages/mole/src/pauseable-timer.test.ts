import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { PauseableTimer } from './pauseable-timer'

describe('PauseableTimer', () => {
  let onTick: Mock<(seconds: number) => void>
  let onTimeout: Mock<() => void>
  let timer: PauseableTimer

  beforeEach(() => {
    vi.useFakeTimers()

    onTick = vi.fn<(seconds: number) => void>()
    onTimeout = vi.fn<() => void>()

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

  it('남은 시간이 0에 도달한 틱에서 onTick(0) 직후 onTimeout이 호출된다', () => {
    timer.start()

    vi.advanceTimersByTime(4999)

    expect(onTimeout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(onTick).toHaveBeenLastCalledWith(0)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    const tickOrder = onTick.mock.invocationCallOrder

    expect(tickOrder[tickOrder.length - 1]).toBeLessThan(
      onTimeout.mock.invocationCallOrder[0],
    )
    expect(timer.isRunning()).toBe(false)

    vi.advanceTimersByTime(3000)

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('pause 전의 1초 미만 진행분이 resume 후에도 이어진다', () => {
    timer.start()
    vi.advanceTimersByTime(1500)
    timer.pause()
    vi.advanceTimersByTime(10000)
    timer.resume()

    expect(onTick).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(499)
    expect(onTick).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(onTick).toHaveBeenCalledTimes(2)
    expect(onTick).toHaveBeenLastCalledWith(3)
  })

  it('pause와 resume을 반복해도 전체 진행 시간은 실제 경과 시간과 같다', () => {
    timer.start()

    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(500)
      timer.pause()
      timer.resume()
    }

    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onTick.mock.calls.map(([seconds]) => seconds)).toEqual([
      4, 3, 2, 1, 0,
    ])
  })

  it('남은 시간이 1초 미만으로 남으면 getRemainingSeconds는 올림한 값을 반환한다', () => {
    timer.start()
    vi.advanceTimersByTime(4500)
    timer.pause()

    expect(timer.getRemainingSeconds()).toBe(1)
    expect(timer.getProgress()).toBe(10)
  })

  it('reset 하면 시간이 초기화된다', () => {
    timer.start()

    vi.advanceTimersByTime(2000)

    timer.reset()

    expect(timer.getRemainingSeconds()).toBe(5)
    expect(timer.isRunning()).toBe(false)
  })
})
