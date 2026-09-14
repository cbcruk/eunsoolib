/**
 * 일시정지와 재개가 가능한 1초 단위 카운트다운 타이머.
 *
 * `setInterval` 기반이라 일시정지하면 진행 중이던 1초 미만 구간은 버려진다.
 * 남은 시간이 `0`이 된 **다음 틱**에 `onTimeout`을 호출한다.
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
  private remainingSeconds: number
  private timerId: ReturnType<typeof setInterval> | null = null
  private onTick?: (seconds: number) => void
  private onTimeout?: () => void

  /**
   * @param totalSeconds - 카운트다운할 전체 시간(초)
   * @param onTick - 1초마다 감소한 뒤의 남은 시간(초)을 받는 콜백
   * @param onTimeout - 남은 시간이 `0`인 상태에서 틱이 오면 타이머를 멈추고 호출하는 콜백
   */
  constructor(
    totalSeconds: number,
    onTick?: (seconds: number) => void,
    onTimeout?: () => void,
  ) {
    this.totalSeconds = totalSeconds
    this.remainingSeconds = totalSeconds
    this.onTick = onTick
    this.onTimeout = onTimeout
  }

  /** 카운트다운을 시작한다. 이미 동작 중이면 아무것도 하지 않는다. */
  start() {
    if (this.timerId) return

    this.timerId = setInterval(() => this.tick(), 1000)
  }

  /** 남은 시간을 유지한 채 카운트다운을 멈춘다. */
  pause() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  /** 멈춘 카운트다운을 다시 시작한다. {@link PauseableTimer.start}와 같다. */
  resume() {
    this.start()
  }

  /** 타이머를 멈추고 남은 시간을 전체 시간으로 되돌린다. */
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

  /** 카운트다운이 동작 중인지 여부. */
  isRunning() {
    return this.timerId !== null
  }

  /** 남은 시간이 `0` 이하인지 여부. */
  isTimeout() {
    return this.remainingSeconds <= 0
  }

  /** 남은 시간(초)을 반환한다. */
  getRemainingSeconds() {
    return this.remainingSeconds
  }

  /** 전체 시간 대비 남은 시간의 비율(`0` ~ `100`, %)을 반환한다. */
  getProgress() {
    return (this.remainingSeconds / this.totalSeconds) * 100
  }
}
