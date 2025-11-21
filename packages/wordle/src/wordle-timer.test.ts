import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WordleTimer } from './wordle-timer'

describe('WordleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('초기 시간은 0 또는 지정된 값이어야 한다', () => {
    const timer1 = new WordleTimer({ id: 't1' })
    expect(timer1.getTime()).toBe(0)

    const timer2 = new WordleTimer({ id: 't2', initialTime: 10 })
    expect(timer2.getTime()).toBe(10)
  })

  it('start()를 호출하면 시간이 증가해야 한다', () => {
    const timer = new WordleTimer({ id: 't1' })

    timer.start()

    vi.advanceTimersByTime(3000)

    expect(timer.getTime()).toBe(3)
  })

  it('stop()을 호출하면 시간 증가가 멈춰야 한다', () => {
    const timer = new WordleTimer({ id: 't1' })
    timer.start()

    vi.advanceTimersByTime(2000)
    timer.stop()
    vi.advanceTimersByTime(2000)

    expect(timer.getTime()).toBe(2)
  })

  it('reset()을 호출하면 시간이 0이 되고 멈춰야 한다', () => {
    const timer = new WordleTimer({ id: 't1' })

    timer.start()

    vi.advanceTimersByTime(2000)

    timer.reset()

    expect(timer.getTime()).toBe(0)

    vi.advanceTimersByTime(2000)

    expect(timer.getTime()).toBe(0)
  })

  it('start()는 중복 실행되지 않아야 한다', () => {
    const timer = new WordleTimer({ id: 't1' })

    timer.start()
    timer.start()

    vi.advanceTimersByTime(2000)

    expect(timer.getTime()).toBe(2)
  })
})
