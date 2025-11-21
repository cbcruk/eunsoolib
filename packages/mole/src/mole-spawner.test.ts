import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MoleSpawner } from './mole-spawner'

describe('MoleSpawner', () => {
  let onSpawn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    onSpawn = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('주어진 delay 간격으로 onSpawn이 호출된다', () => {
    const spawner = new MoleSpawner({
      totalSlots: 9,
      spawnCount: 3,
      onSpawn,
    })

    spawner.start()

    vi.advanceTimersByTime(3000)

    expect(onSpawn).toHaveBeenCalledTimes(3)
  })

  it('stop을 호출하면 더 이상 onSpawn이 호출되지 않는다', () => {
    const spawner = new MoleSpawner({
      totalSlots: 9,
      spawnCount: 3,
      onSpawn,
    })

    spawner.start()
    vi.advanceTimersByTime(2000)
    spawner.stop()
    vi.advanceTimersByTime(2000)

    expect(onSpawn).toHaveBeenCalledTimes(2)
  })

  it('선택된 인덱스는 중복되지 않고 개수는 정확하다', () => {
    const spawner = new MoleSpawner({
      totalSlots: 9,
      spawnCount: 3,
      onSpawn,
    })

    spawner.start()

    vi.advanceTimersByTime(1000)

    const [indexes] = onSpawn.mock.calls[0]
    const unique = new Set(indexes)

    expect(indexes).toHaveLength(3)
    expect(unique.size).toBe(3)
  })

  it('남은 시간이 적을수록 visibility 시간도 줄어든다', () => {
    const spawner = new MoleSpawner({
      totalSlots: 9,
      spawnCount: 1,
      getRemainingSeconds: () => 10,
      onSpawn,
    })

    spawner.start()

    vi.advanceTimersByTime(1000)

    const [, visibility] = onSpawn.mock.calls[0]

    expect(visibility).toBeLessThan(1500)
    expect(visibility).toBeGreaterThanOrEqual(300)
  })
})
