type WordleTimerOptions = {
  /** 타이머 식별자 */
  id: string
  /** 시작 카운트. @default 0 */
  initialTime?: number
  /** 카운트를 1씩 올리는 간격(ms). @default 1000 */
  interval?: number
}

/** 일정 간격마다 1씩 증가하는 경과 시간 카운터. */
export class WordleTimer {
  private id: WordleTimerOptions['id']
  private time: number
  private interval: number
  private timer: ReturnType<typeof setInterval> | null = null

  /** @param options - 식별자, 시작 카운트, 증가 간격 */
  constructor({ id, initialTime = 0, interval = 1000 }: WordleTimerOptions) {
    this.id = id
    this.time = initialTime
    this.interval = interval
  }

  /** 카운트를 시작한다. 이미 동작 중이면 아무것도 하지 않는다. */
  start() {
    if (this.timer) {
      return
    }

    this.timer = setInterval(() => {
      this.time += 1
    }, this.interval)
  }

  /** 카운트를 멈춘다. */
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** 카운트를 멈추고 `0`으로 되돌린다. `initialTime`이 아니라 항상 `0`이다. */
  reset() {
    this.stop()
    this.time = 0
  }

  /** 현재 카운트를 반환한다. */
  getTime() {
    return this.time
  }
}
