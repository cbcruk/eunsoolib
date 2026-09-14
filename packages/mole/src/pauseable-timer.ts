/**
 * 일시정지와 재개가 가능한 1초 단위 카운트다운 타이머.
 *
 * 남은 시간을 밀리초로 들고 실제 경과 시간(`Date.now()`)으로 차감하므로,
 * 일시정지해도 진행 중이던 1초 미만 구간이 버려지지 않고 재개 후 이어서 흐른다.
 * 남은 시간이 `0`에 도달한 틱에서 `onTick(0)`을 호출한 뒤 곧바로 `onTimeout`을 호출한다.
 *
 * @example
 * ```ts
 * import { PauseableTimer } from '@cbcruk/mole'
 *
 * const timer = new PauseableTimer(
 *   30,
 *   (seconds) => console.log(seconds),
 *   () => console.log('timeout'),
 * )
 *
 * timer.start()
 * ```
 */
export class PauseableTimer {
  private totalSeconds: number
  private remainingMs: number
  private lastReportedSeconds: number
  private runningSince: number | null = null
  private timerId: ReturnType<typeof setTimeout> | null = null
  private onTick?: (seconds: number) => void
  private onTimeout?: () => void

  /**
   * @param totalSeconds - 카운트다운할 전체 시간(초)
   * @param onTick - 남은 시간이 1초 줄어들 때마다 줄어든 뒤의 남은 시간(초)을 받는 콜백
   * @param onTimeout - 남은 시간이 `0`에 도달하면 타이머를 멈추고 `onTick(0)` 직후 호출하는 콜백
   */
  constructor(
    totalSeconds: number,
    onTick?: (seconds: number) => void,
    onTimeout?: () => void,
  ) {
    this.totalSeconds = totalSeconds
    this.remainingMs = totalSeconds * 1000
    this.lastReportedSeconds = totalSeconds
    this.onTick = onTick
    this.onTimeout = onTimeout
  }

  /** 카운트다운을 시작한다. 이미 동작 중이거나 시간이 다 됐으면 아무것도 하지 않는다. */
  start() {
    if (this.timerId !== null || this.remainingMs <= 0) return

    this.runningSince = Date.now()
    this.schedule()
  }

  /** 남은 시간을 밀리초 단위까지 유지한 채 카운트다운을 멈춘다. */
  pause() {
    if (this.timerId === null) return

    this.syncRemaining()
    clearTimeout(this.timerId)
    this.timerId = null
    this.runningSince = null
  }

  /** 멈춘 카운트다운을 다시 시작한다. {@link PauseableTimer.start}와 같다. */
  resume() {
    this.start()
  }

  /** 타이머를 멈추고 남은 시간을 전체 시간으로 되돌린다. */
  reset() {
    this.pause()
    this.remainingMs = this.totalSeconds * 1000
    this.lastReportedSeconds = this.totalSeconds
  }

  private schedule() {
    const untilNextSecond = this.remainingMs % 1000 || 1000

    this.timerId = setTimeout(() => this.tick(), untilNextSecond)
  }

  private syncRemaining() {
    if (this.runningSince === null) return

    const now = Date.now()

    this.remainingMs = Math.max(0, this.remainingMs - (now - this.runningSince))
    this.runningSince = now
  }

  private tick() {
    this.timerId = null
    this.syncRemaining()

    const seconds = Math.ceil(this.remainingMs / 1000)

    if (seconds < this.lastReportedSeconds) {
      this.lastReportedSeconds = seconds
      this.onTick?.(seconds)
    }

    if (this.remainingMs <= 0) {
      this.runningSince = null
      this.onTimeout?.()

      return
    }

    this.schedule()
  }

  private currentRemainingMs() {
    if (this.runningSince === null) return this.remainingMs

    return Math.max(0, this.remainingMs - (Date.now() - this.runningSince))
  }

  /** 카운트다운이 동작 중인지 여부. */
  isRunning() {
    return this.timerId !== null
  }

  /** 남은 시간이 `0` 이하인지 여부. */
  isTimeout() {
    return this.currentRemainingMs() <= 0
  }

  /** 남은 시간(초)을 반환한다. 1초 미만 구간은 올림한다. */
  getRemainingSeconds() {
    return Math.ceil(this.currentRemainingMs() / 1000)
  }

  /** 전체 시간 대비 남은 시간의 비율(`0` ~ `100`, %)을 반환한다. */
  getProgress() {
    return (this.currentRemainingMs() / (this.totalSeconds * 1000)) * 100
  }
}
