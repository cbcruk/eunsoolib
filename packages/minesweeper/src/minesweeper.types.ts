/** 셀 위치 */
export interface Position {
  /** 행 인덱스 (0부터) */
  row: number
  /** 열 인덱스 (0부터) */
  col: number
}

/** 셀의 표시 상태 */
export type CellState = 'hidden' | 'revealed' | 'flagged'

/** 셀 정보 */
export interface Cell {
  /** 지뢰 여부 */
  isMine: boolean
  /** 주변 8칸에 있는 지뢰 수 (0-8) */
  adjacentMines: number
  /** 표시 상태 */
  state: CellState
}

/** 셀 2차원 배열 (`board[row][col]`) */
export type Board = Cell[][]

/**
 * 게임 진행 상태
 *
 * - `ready`: 첫 칸을 열기 전. 지뢰가 아직 배치되지 않았을 수 있다
 * - `playing`: 진행 중
 * - `won`: 지뢰가 아닌 칸을 모두 열었다
 * - `lost`: 지뢰를 열었다
 */
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost'

/** 기본 제공 난이도 */
export type Difficulty = 'beginner' | 'intermediate' | 'expert'

/** 보드 크기와 지뢰 수 */
export interface BoardConfig {
  /** 행 수 (1 이상) */
  rows: number
  /** 열 수 (1 이상) */
  cols: number
  /** 지뢰 수 (0 이상, 전체 칸 수 미만) */
  mines: number
}

/** {@link MinesweeperEngine} 생성 옵션 */
export interface MinesweeperOptions {
  /** 난이도 이름 또는 직접 지정한 보드 설정. @default 'beginner' */
  config?: Difficulty | BoardConfig
  /**
   * 지뢰 위치를 직접 지정한다.
   *
   * 지정하면 첫 클릭 보호 없이 이 위치를 그대로 쓰고, `config.mines`는 위치 개수로 대체된다.
   * 테스트나 공유된 판을 재현할 때 쓴다.
   */
  minePositions?: Position[]
  /** 지뢰 배치에 쓰는 난수 함수 (`[0, 1)`). @default Math.random */
  random?: () => number
  /** 경과 시간 계산에 쓰는 현재 시각 함수(ms). @default Date.now */
  now?: () => number
}
