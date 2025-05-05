type WordleTimerOptions = {
  id: string
  initialTime?: number
  interval?: number
}

export class WordleTimer {
  private id: WordleTimerOptions['id']
  private time: number
  private interval: number
  private timer: ReturnType<typeof setInterval> | null = null

  constructor({ id, initialTime = 0, interval = 1000 }: WordleTimerOptions) {
    this.id = id
    this.time = initialTime
    this.interval = interval
  }

  start() {
    if (this.timer) {
      return
    }

    this.timer = setInterval(() => {
      this.time += 1
    }, this.interval)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  reset() {
    this.stop()
    this.time = 0
  }

  getTime() {
    return this.time
  }
}
