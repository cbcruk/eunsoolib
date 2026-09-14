type MoleSpawnerOptions = {
  /** 행 × 열 */
  totalSlots: number
  /** 동시 출현할 두더지 수 */
  spawnCount: number
  /** 남은 시간 기반 동적 난이도 */
  getRemainingSeconds?: () => number
  /** 고른 칸 번호 목록과 두더지를 보여줄 시간(ms)을 받는 콜백 */
  onSpawn: (activeIndexes: number[], visibilityDuration: number) => void
}

/**
 * 일정 간격마다 두더지가 나타날 칸을 무작위로 골라 알린다.
 *
 * 매 간격(기본 1000ms)마다 Fisher-Yates로 `0 ~ totalSlots - 1` 중 중복 없이 `spawnCount`개를 고르고,
 * 보이는 시간을 `300 + 1200 × (남은 초 / 60)`ms(비율은 0~1로 clamp)로 계산해 `onSpawn`에 넘긴다.
 * `getRemainingSeconds`가 없으면 남은 시간을 60초로 간주한다.
 *
 * @example
 * ```ts
 * import { MoleSpawner } from '@cbcruk/mole'
 *
 * const spawner = new MoleSpawner({
 *   totalSlots: 9,
 *   spawnCount: 3,
 *   onSpawn: (indexes, visibility) => console.log(indexes, visibility),
 * })
 *
 * spawner.start()
 * ```
 */
export class MoleSpawner {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private delay = 1000

  /** @param options - 칸 수, 출현 수, 남은 시간 조회 함수, 출현 콜백 */
  constructor(private options: MoleSpawnerOptions) {}

  /** 출현 루프를 시작한다. 이미 동작 중이면 아무것도 하지 않는다. */
  start() {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      const indexes = this.pickRandomIndexes()
      const visibility = this.calculateVisibility()

      this.options.onSpawn(indexes, visibility)
    }, this.delay)
  }

  /** 출현 루프를 멈춘다. */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * 출현 간격을 바꾸고 루프를 다시 시작한다.
   *
   * 멈춰 있던 상태에서 호출해도 루프가 시작된다.
   *
   * @param newDelay - 새 출현 간격(ms)
   */
  updateDelay(newDelay: number) {
    this.delay = newDelay
    this.stop()
    this.start()
  }

  private pickRandomIndexes(): number[] {
    const { totalSlots, spawnCount } = this.options
    const allIndexes = Array.from({ length: totalSlots }, (_, i) => i)

    for (let i = allIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))

      ;[allIndexes[i], allIndexes[j]] = [allIndexes[j], allIndexes[i]]
    }

    return allIndexes.slice(0, spawnCount)
  }

  private calculateVisibility(): number {
    const remaining = this.options.getRemainingSeconds?.() ?? 60

    const minTime = 300
    const maxTime = 1500
    const ratio = Math.max(0, Math.min(1, remaining / 60))

    return Math.floor(minTime + (maxTime - minTime) * ratio)
  }
}
