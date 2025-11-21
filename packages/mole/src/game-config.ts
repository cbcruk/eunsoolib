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

export class GameConfig {
  row: number
  col: number
  moleCount: number

  static readonly MIN_SIZE = 2
  static readonly MAX_SIZE = 6

  constructor(row: number, col: number, moleCount: number) {
    if (!GameConfig.isValidSize(row, col)) {
      throw new Error(
        `행/열은 ${GameConfig.MIN_SIZE} ~ ${GameConfig.MAX_SIZE} 사이여야 합니다.`
      )
    }

    const maxMoleCount = Math.floor((row * col) / 2)

    if (moleCount < 1 || moleCount >= maxMoleCount) {
      throw new Error(
        `두더지는 1마리 이상, 전체 굴 수의 절반 미만이어야 합니다.`
      )
    }

    this.row = row
    this.col = col
    this.moleCount = moleCount
  }

  static isValidSize(row: number, col: number) {
    return (
      row >= GameConfig.MIN_SIZE &&
      row <= GameConfig.MAX_SIZE &&
      col >= GameConfig.MIN_SIZE &&
      col <= GameConfig.MAX_SIZE
    )
  }

  get totalSlots(): number {
    return this.row * this.col
  }

  clone(): GameConfig {
    return new GameConfig(this.row, this.col, this.moleCount)
  }
}
