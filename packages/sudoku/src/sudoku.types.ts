/** 셀 값: 1-9 또는 0(빈 셀) */
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** 9x9 스도쿠 보드 */
export type Board = CellValue[][]

/** 셀 위치 */
export interface Position {
  row: number
  col: number
}

/** 셀 정보 */
export interface Cell {
  value: CellValue
  isFixed: boolean // 초기 퍼즐에서 주어진 숫자인지
  memos: Set<number> // 메모 (후보 숫자들)
}

/** 9x9 셀 그리드 */
export type CellGrid = Cell[][]

/** 난이도 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface GameAction {
  type: 'setValue' | 'clearValue' | 'toggleMemo' | 'clearMemos'
  position: Position
  previousValue?: CellValue
  newValue?: CellValue
  previousMemos?: Set<number>
  memoValue?: number
}

export interface GameState {
  grid: CellGrid
  isCompleted: boolean
  isSolved: boolean
}

export const DIFFICULTY_CELLS_TO_REMOVE: Record<
  Difficulty,
  { min: number; max: number }
> = {
  easy: { min: 30, max: 35 },
  medium: { min: 36, max: 45 },
  hard: { min: 46, max: 52 },
  expert: { min: 53, max: 58 },
}
