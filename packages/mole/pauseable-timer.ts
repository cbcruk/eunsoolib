export class PauseableTimer {
  private totalSeconds: number
  private remainingSeconds: number
  private timerId: ReturnType<typeof setInterval> | null = null
  private onTick?: (seconds: number) => void
  private onTimeout?: () => void

  constructor(
    totalSeconds: number,
    onTick?: (seconds: number) => void,
    onTimeout?: () => void
  ) {
    this.totalSeconds = totalSeconds
    this.remainingSeconds = totalSeconds
    this.onTick = onTick
    this.onTimeout = onTimeout
  }

  start() {
    if (this.timerId) return

    this.timerId = setInterval(() => this.tick(), 1000)
  }

  pause() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  resume() {
    this.start()
  }

  reset() {
    this.pause()
    this.remainingSeconds = this.totalSeconds
  }

  private tick() {
    if (this.remainingSeconds <= 0) {
      this.pause()
      this.onTimeout?.()

      return
    }

    this.remainingSeconds -= 1
    this.onTick?.(this.remainingSeconds)
  }

  isRunning() {
    return this.timerId !== null
  }

  isTimeout() {
    return this.remainingSeconds <= 0
  }

  getRemainingSeconds() {
    return this.remainingSeconds
  }

  getProgress() {
    return (this.remainingSeconds / this.totalSeconds) * 100
  }
}
