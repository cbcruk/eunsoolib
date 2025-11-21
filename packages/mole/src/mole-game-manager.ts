import { type GameConfig, GameState } from './game-config'
import { MoleSpawner } from './mole-spawner'
import { ScoreManager } from './score-manager'
import { PauseableTimer } from './pauseable-timer'

type MoleGameOptions = {
  config: GameConfig
  onTick?: (remainingTime: number) => void
  onTimeout?: () => void
  onScoreUpdate?: (score: number, rank: string) => void
  onSpawn?: (indexes: number[], visibility: number) => void
  onStateChange?: (state: GameState) => void
}

export class MoleGameManager {
  private config: GameConfig
  private state: GameState = GameState.Idle
  private scoreManager = new ScoreManager()
  private timer: PauseableTimer
  private spawner: MoleSpawner
  private options: MoleGameOptions

  constructor(options: MoleGameOptions) {
    this.config = options.config
    this.options = options

    this.timer = new PauseableTimer(
      60,
      (remaining) => this.options.onTick?.(remaining),
      () => {
        this.end()
        this.options.onTimeout?.()
      }
    )

    this.spawner = new MoleSpawner({
      totalSlots: this.config.totalSlots,
      spawnCount: this.config.moleCount,
      getRemainingSeconds: () => this.timer.getRemainingSeconds(),
      onSpawn: (indexes, visibility) => {
        if (this.state === GameState.Playing) {
          this.options.onSpawn?.(indexes, visibility)
        }
      },
    })
  }

  private setState(state: GameState) {
    this.state = state
    this.options.onStateChange?.(state)
  }

  start() {
    if (this.state !== GameState.Idle && this.state !== GameState.Ended) return

    this.setState(GameState.Playing)
    this.scoreManager.resetScore()
    this.timer.reset()
    this.timer.start()
    this.spawner.start()
  }

  pause() {
    if (this.state !== GameState.Playing) return

    this.setState(GameState.Paused)
    this.timer.pause()
    this.spawner.stop()
  }

  resume() {
    if (this.state !== GameState.Paused) return

    this.setState(GameState.Playing)
    this.timer.resume()
    this.spawner.start()
  }

  end() {
    if (this.state === GameState.Ended) return

    this.setState(GameState.Ended)
    this.timer.pause()
    this.spawner.stop()
  }

  reset() {
    this.setState(GameState.Idle)
    this.timer.reset()
    this.scoreManager.resetScore()
  }

  hit(points = 10) {
    if (this.state !== GameState.Playing) return

    this.scoreManager.add(points)
    this.options.onScoreUpdate?.(
      this.scoreManager.getScore(),
      this.scoreManager.getRankName()
    )
  }

  getScore() {
    return this.scoreManager.getScore()
  }

  getRank() {
    return this.scoreManager.getRankName()
  }

  getRemainingSeconds() {
    return this.timer.getRemainingSeconds()
  }

  getState() {
    return this.state
  }

  getConfig() {
    return this.config.clone()
  }
}
