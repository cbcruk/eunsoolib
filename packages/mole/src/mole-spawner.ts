type MoleSpawnerOptions = {
  /** 행 × 열 */
  totalSlots: number
  /** 동시 출현할 두더지 수 */
  spawnCount: number
  /** 남은 시간 기반 동적 난이도 */
  getRemainingSeconds?: () => number
  onSpawn: (activeIndexes: number[], visibilityDuration: number) => void
}

export class MoleSpawner {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private delay = 1000

  constructor(private options: MoleSpawnerOptions) {}

  start() {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      const indexes = this.pickRandomIndexes()
      const visibility = this.calculateVisibility()

      this.options.onSpawn(indexes, visibility)
    }, this.delay)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

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
