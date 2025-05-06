import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MoleGameManager } from './mole-game-manager'
import { GameConfig, GameState } from './game-config'

describe('MoleGameManager', () => {
  let game: MoleGameManager
  let onTick: ReturnType<typeof vi.fn>
  let onSpawn: ReturnType<typeof vi.fn>
  let onScoreUpdate: ReturnType<typeof vi.fn>
  let onTimeout: ReturnType<typeof vi.fn>
  let onStateChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    onTick = vi.fn()
    onSpawn = vi.fn()
    onScoreUpdate = vi.fn()
    onTimeout = vi.fn()
    onStateChange = vi.fn()

    const config = new GameConfig(3, 3, 3) // 3x3, 최대 3마리

    game = new MoleGameManager({
      config,
      onTick,
      onSpawn,
      onScoreUpdate,
      onTimeout,
      onStateChange,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('게임 시작 시 상태가 Playing이 되고 두더지가 나타난다', () => {
    game.start()

    vi.advanceTimersByTime(1000)

    expect(game.getState()).toBe(GameState.Playing)
    expect(onStateChange).toHaveBeenCalledWith(GameState.Playing)
    expect(onSpawn).toHaveBeenCalled()
  })

  it('일시정지 후 타이머가 멈춘다', () => {
    game.start()
    game.pause()

    const before = game.getRemainingSeconds()
    vi.advanceTimersByTime(3000)
    const after = game.getRemainingSeconds()

    expect(game.getState()).toBe(GameState.Paused)
    expect(before).toBe(after)
  })

  it('재개 후 타이머가 다시 진행된다', () => {
    game.start()
    game.pause()
    game.resume()

    vi.advanceTimersByTime(2000)

    expect(game.getState()).toBe(GameState.Playing)
    expect(game.getRemainingSeconds()).toBeLessThan(60)
  })

  it('시간 초과 시 종료된다', () => {
    game.start()

    vi.advanceTimersByTime(61000)

    expect(game.getState()).toBe(GameState.Ended)
    expect(onTimeout).toHaveBeenCalled()
  })

  it('점수를 얻고 랭크가 반영된다', () => {
    game.start()
    game.hit(30)

    expect(game.getScore()).toBe(30)
    expect(onScoreUpdate).toHaveBeenCalledWith(30, expect.any(String))
  })

  it('게임 초기화 시 상태와 점수가 초기화된다', () => {
    game.start()
    game.hit(50)
    game.reset()

    expect(game.getState()).toBe(GameState.Idle)
    expect(game.getScore()).toBe(0)
    expect(game.getRemainingSeconds()).toBe(60)
  })
})
