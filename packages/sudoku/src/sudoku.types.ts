/** 셀 값: 1-9 또는 0(빈 셀) */
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** 9x9 스도쿠 보드 */
export type Board = CellValue[][]

/** 셀 위치 */
export interface Position {
  /** 행 인덱스 (0-8) */
  row: number
  /** 열 인덱스 (0-8) */
  col: number
}

/** 셀 정보 */
export interface Cell {
  /** 셀 값 (0은 빈 셀) */
  value: CellValue
  /** 초기 퍼즐에서 주어진 숫자인지 여부 */
  isFixed: boolean
  /** 메모 (후보 숫자들) */
  memos: Set<number>
}

/** 9x9 셀 그리드 */
export type CellGrid = Cell[][]

/** 난이도 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

/** 실행취소·재실행을 위해 기록하는 입력 액션 */
export interface GameAction {
  /** 액션 종류 (`setValue`에 0을 넣으면 `clearValue`로 기록) */
  type: 'setValue' | 'clearValue' | 'toggleMemo' | 'clearMemos'
  /** 대상 셀 위치 */
  position: Position
  /** 변경 전 값 (값 입력·삭제 액션) */
  previousValue?: CellValue
  /** 변경 후 값 (값 입력·삭제 액션) */
  newValue?: CellValue
  /** 변경 전 메모 */
  previousMemos?: Set<number>
  /** 토글한 메모 숫자 (`toggleMemo` 액션) */
  memoValue?: number
}

/**
 * 게임 상태 스냅샷
 *
 * 현재 엔진에서는 사용하지 않는 타입
 */
export interface GameState {
  /** 셀 그리드 */
  grid: CellGrid
  /** 모든 셀이 채워졌는지 여부 */
  isCompleted: boolean
  /** 올바르게 풀렸는지 여부 */
  isSolved: boolean
}

/** 난이도별로 비울 칸 수 범위 (`min` 이상 `max` 이하) */
export const DIFFICULTY_CELLS_TO_REMOVE: Record<
  Difficulty,
  { min: number; max: number }
> = {
  easy: { min: 30, max: 35 },
  medium: { min: 36, max: 45 },
  hard: { min: 46, max: 52 },
  expert: { min: 53, max: 58 },
}
