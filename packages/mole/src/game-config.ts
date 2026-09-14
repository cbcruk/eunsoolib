/** 두더지 잡기 게임의 진행 상태. */
export enum GameState {
  /** 준비화면 (게임 대기 중) */
  Idle = 'IDLE',
  /** 게임 중 */
  Playing = 'PLAYING',
  /** 일시정지 상태 */
  Paused = 'PAUSED',
  /** 결과화면 */
  Ended = 'ENDED',
}

/**
 * 격자 크기와 한 번에 출현할 두더지 수를 담은 게임 설정.
 *
 * @example
 * ```ts
 * import { GameConfig } from '@cbcruk/mole'
 *
 * const config = new GameConfig(3, 4, 5)
 * config.totalSlots // 12
 * ```
 */
export class GameConfig {
  /** 격자의 행 수. */
  row: number
  /** 격자의 열 수. */
  col: number
  /** 한 번에 출현할 두더지 수. */
  moleCount: number

  /** 행·열의 최솟값. */
  static readonly MIN_SIZE = 2
  /** 행·열의 최댓값. */
  static readonly MAX_SIZE = 6

  /**
   * 설정값을 검증해 인스턴스를 만든다.
   *
   * @param row - 행 수. {@link GameConfig.MIN_SIZE} 이상 {@link GameConfig.MAX_SIZE} 이하
   * @param col - 열 수. {@link GameConfig.MIN_SIZE} 이상 {@link GameConfig.MAX_SIZE} 이하
   * @param moleCount - 한 번에 출현할 두더지 수. `1` 이상 `Math.floor(row * col / 2)` 미만
   * @throws 행·열이 범위를 벗어나거나 `moleCount`가 허용 범위를 벗어나면 `Error`를 던진다.
   */
  constructor(row: number, col: number, moleCount: number) {
    if (!GameConfig.isValidSize(row, col)) {
      throw new Error(
        `행/열은 ${GameConfig.MIN_SIZE} ~ ${GameConfig.MAX_SIZE} 사이여야 합니다.`,
      )
    }

    const maxMoleCount = Math.floor((row * col) / 2)

    if (moleCount < 1 || moleCount >= maxMoleCount) {
      throw new Error(
        `두더지는 1마리 이상, 전체 굴 수의 절반 미만이어야 합니다.`,
      )
    }

    this.row = row
    this.col = col
    this.moleCount = moleCount
  }

  /** 행과 열이 모두 {@link GameConfig.MIN_SIZE} ~ {@link GameConfig.MAX_SIZE} 범위인지 확인한다. */
  static isValidSize(row: number, col: number) {
    return (
      row >= GameConfig.MIN_SIZE &&
      row <= GameConfig.MAX_SIZE &&
      col >= GameConfig.MIN_SIZE &&
      col <= GameConfig.MAX_SIZE
    )
  }

  /** 전체 칸 수(`row * col`). */
  get totalSlots(): number {
    return this.row * this.col
  }

  /** 같은 값을 가진 새 인스턴스를 반환한다. */
  clone(): GameConfig {
    return new GameConfig(this.row, this.col, this.moleCount)
  }
}
