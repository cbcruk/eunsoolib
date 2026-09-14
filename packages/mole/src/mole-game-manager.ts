import { type GameConfig, GameState } from './game-config'
import { MoleSpawner } from './mole-spawner'
import { ScoreManager } from './score-manager'
import { PauseableTimer } from './pauseable-timer'

type MoleGameOptions = {
  /** 격자 크기와 두더지 수 설정 */
  config: GameConfig
  /** 1초마다 남은 시간(초)을 받는 콜백 */
  onTick?: (remainingTime: number) => void
  /** 시간이 다 되어 `Ended`로 전환된 뒤 호출되는 콜백 */
  onTimeout?: () => void
  /** `hit()`으로 점수가 바뀐 직후 점수와 랭크 이름을 받는 콜백 */
  onScoreUpdate?: (score: number, rank: string) => void
  /** `Playing` 상태에서 두더지가 나타날 칸 번호와 보이는 시간(ms)을 받는 콜백 */
  onSpawn?: (indexes: number[], visibility: number) => void
  /** 상태가 바뀔 때마다 새 상태를 받는 콜백 */
  onStateChange?: (state: GameState) => void
}

/**
 * 타이머·스포너·점수를 조립해 60초짜리 두더지 잡기 게임의 상태 전이를 관리한다.
 *
 * 현재 상태에서 허용되지 않은 호출(예: `Idle`에서 `pause()`)은 조용히 무시된다.
 * 렌더링과 클릭 판정은 콜백을 받는 쪽이 담당한다.
 *
 * @example
 * ```ts
 * import { GameConfig, MoleGameManager } from '@cbcruk/mole'
 *
 * const game = new MoleGameManager({
 *   config: new GameConfig(3, 3, 3),
 *   onSpawn: (indexes, visibility) => console.log(indexes, visibility),
 *   onScoreUpdate: (score, rank) => console.log(score, rank),
 * })
 *
 * game.start()
 * game.hit()
 * ```
 */
export class MoleGameManager {
  private config: GameConfig
  private state: GameState = GameState.Idle
  private scoreManager = new ScoreManager()
  private timer: PauseableTimer
  private spawner: MoleSpawner
  private options: MoleGameOptions

  /** @param options - 게임 설정과 이벤트 콜백 */
  constructor(options: MoleGameOptions) {
    this.config = options.config
    this.options = options

    this.timer = new PauseableTimer(
      60,
      (remaining) => this.options.onTick?.(remaining),
      () => {
        this.end()
        this.options.onTimeout?.()
      },
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

  /** `Idle` 또는 `Ended`에서 점수와 타이머를 초기화하고 게임을 시작한다. */
  start() {
    if (this.state !== GameState.Idle && this.state !== GameState.Ended) return

    this.setState(GameState.Playing)
    this.scoreManager.resetScore()
    this.timer.reset()
    this.timer.start()
    this.spawner.start()
  }

  /** `Playing`에서 타이머와 스포너를 멈추고 `Paused`로 전환한다. */
  pause() {
    if (this.state !== GameState.Playing) return

    this.setState(GameState.Paused)
    this.timer.pause()
    this.spawner.stop()
  }

  /** `Paused`에서 타이머와 스포너를 다시 시작하고 `Playing`으로 전환한다. */
  resume() {
    if (this.state !== GameState.Paused) return

    this.setState(GameState.Playing)
    this.timer.resume()
    this.spawner.start()
  }

  /** 타이머와 스포너를 멈추고 `Ended`로 전환한다. 이미 `Ended`면 아무것도 하지 않는다. */
  end() {
    if (this.state === GameState.Ended) return

    this.setState(GameState.Ended)
    this.timer.pause()
    this.spawner.stop()
  }

  /** 상태와 무관하게 `Idle`로 전환하고 타이머와 점수를 초기화한다. */
  reset() {
    this.setState(GameState.Idle)
    this.timer.reset()
    this.scoreManager.resetScore()
  }

  /**
   * `Playing`일 때 점수를 더하고 `onScoreUpdate`를 호출한다.
   *
   * 두더지가 실제로 맞았는지는 호출하는 쪽이 판정한다.
   *
   * @param points - 더할 점수
   */
  hit(points = 10) {
    if (this.state !== GameState.Playing) return

    this.scoreManager.add(points)
    this.options.onScoreUpdate?.(
      this.scoreManager.getScore(),
      this.scoreManager.getRankName(),
    )
  }

  /** 현재 점수를 반환한다. */
  getScore() {
    return this.scoreManager.getScore()
  }

  /** 현재 점수에 해당하는 랭크 이름을 반환한다. */
  getRank() {
    return this.scoreManager.getRankName()
  }

  /** 남은 시간(초)을 반환한다. */
  getRemainingSeconds() {
    return this.timer.getRemainingSeconds()
  }

  /** 현재 게임 상태를 반환한다. */
  getState() {
    return this.state
  }

  /** 게임 설정의 복사본을 반환한다. */
  getConfig() {
    return this.config.clone()
  }
}
