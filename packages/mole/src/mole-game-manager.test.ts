import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { MoleGameManager } from './mole-game-manager'
import { GameConfig, GameState } from './game-config'

describe('MoleGameManager', () => {
  let game: MoleGameManager
  let onTick: Mock<(remainingTime: number) => void>
  let onSpawn: Mock<(indexes: number[], visibility: number) => void>
  let onScoreUpdate: Mock<(score: number, rank: string) => void>
  let onTimeout: Mock<() => void>
  let onStateChange: Mock<(state: GameState) => void>

  beforeEach(() => {
    vi.useFakeTimers()

    onTick = vi.fn<(remainingTime: number) => void>()
    onSpawn = vi.fn<(indexes: number[], visibility: number) => void>()
    onScoreUpdate = vi.fn<(score: number, rank: string) => void>()
    onTimeout = vi.fn<() => void>()
    onStateChange = vi.fn<(state: GameState) => void>()

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

  it('60초 게임은 정확히 60초 시점에 종료된다', () => {
    game.start()

    vi.advanceTimersByTime(59999)

    expect(game.getState()).toBe(GameState.Playing)
    expect(onTimeout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(game.getState()).toBe(GameState.Ended)
    expect(onTick).toHaveBeenLastCalledWith(0)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('일시정지 전후의 1초 미만 진행분이 합산된다', () => {
    game.start()
    vi.advanceTimersByTime(1500)
    game.pause()
    game.resume()
    vi.advanceTimersByTime(500)

    expect(game.getRemainingSeconds()).toBe(58)
    expect(onTick).toHaveBeenLastCalledWith(58)
  })

  it('Idle 상태에서 end를 호출하면 무시된다', () => {
    game.end()

    expect(game.getState()).toBe(GameState.Idle)
    expect(onStateChange).not.toHaveBeenCalled()
  })

  it('Ended 상태에서 end를 다시 호출하면 무시된다', () => {
    game.start()
    game.end()
    onStateChange.mockClear()

    game.end()

    expect(onStateChange).not.toHaveBeenCalled()
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

  it('Playing 중 reset하면 스포너와 타이머가 모두 멈춘다', () => {
    game.start()
    vi.advanceTimersByTime(500)
    game.reset()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('reset 후 다시 start하면 스포너가 새로 시작한 시점부터 1초 간격으로 동작한다', () => {
    game.start()
    vi.advanceTimersByTime(500)
    game.reset()
    game.start()
    onSpawn.mockClear()

    vi.advanceTimersByTime(999)
    expect(onSpawn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onSpawn).toHaveBeenCalledTimes(1)
  })
})
