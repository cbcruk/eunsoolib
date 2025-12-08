import type {
  Board,
  Cell,
  CellGrid,
  CellValue,
  Difficulty,
  GameAction,
  Position,
} from './sudoku.types'
import { generatePuzzle, type GeneratedPuzzle } from './sudoku.generator'
import { getHint, solve } from './sudoku.solver'
import {
  cloneBoard,
  getConflictingCells,
  isBoardSolved,
  isBoardValid,
} from './sudoku.utils'

/**
 * 스도쿠 게임 엔진
 * @description 스도쿠 퍼즐의 생성, 플레이, 힌트, 실행취소/재실행 등을 관리하는 클래스
 */
export class SudokuEngine {
  private grid: CellGrid
  private solution: Board
  private difficulty: Difficulty
  private undoStack: GameAction[] = []
  private redoStack: GameAction[] = []

  /**
   * @param puzzle - 초기 퍼즐 데이터. 없으면 medium 난이도로 자동 생성
   */
  constructor(puzzle?: GeneratedPuzzle) {
    if (puzzle) {
      this.grid = this.boardToCellGrid(puzzle.puzzle)
      this.solution = puzzle.solution
      this.difficulty = puzzle.difficulty
    } else {
      const generated = generatePuzzle('medium')
      this.grid = this.boardToCellGrid(generated.puzzle)
      this.solution = generated.solution
      this.difficulty = generated.difficulty
    }
  }

  /**
   * 새 게임 시작
   * @param difficulty - 난이도 (기본값: 'medium')
   */
  newGame(difficulty: Difficulty = 'medium'): void {
    const generated = generatePuzzle(difficulty)

    this.grid = this.boardToCellGrid(generated.puzzle)
    this.solution = generated.solution
    this.difficulty = difficulty
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * 외부 퍼즐로 게임 시작
   * @param board - 로드할 9x9 스도쿠 보드
   */
  loadPuzzle(board: Board): void {
    this.grid = this.boardToCellGrid(board)

    const solved = solve(board)

    this.solution = solved || board
    this.difficulty = 'medium'
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * 셀에 값 설정
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @param value - 설정할 값 (0-9, 0은 빈 셀)
   * @returns 성공 여부 (고정 셀이면 false)
   */
  setValue(row: number, col: number, value: CellValue): boolean {
    const cell = this.grid[row][col]

    if (cell.isFixed) return false

    const action: GameAction = {
      type: value === 0 ? 'clearValue' : 'setValue',
      position: { row, col },
      previousValue: cell.value,
      newValue: value,
      previousMemos: new Set(cell.memos),
    }

    cell.value = value
    cell.memos.clear()

    this.undoStack.push(action)
    this.redoStack = []

    return true
  }

  /**
   * 셀 값 삭제
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @returns 성공 여부
   */
  clearValue(row: number, col: number): boolean {
    return this.setValue(row, col, 0)
  }

  /**
   * 메모 토글
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @param num - 토글할 숫자 (1-9)
   * @returns 성공 여부 (고정 셀이거나 값이 있으면 false)
   */
  toggleMemo(row: number, col: number, num: number): boolean {
    const cell = this.grid[row][col]

    if (cell.isFixed || cell.value !== 0) return false

    const action: GameAction = {
      type: 'toggleMemo',
      position: { row, col },
      previousMemos: new Set(cell.memos),
      memoValue: num,
    }

    if (cell.memos.has(num)) {
      cell.memos.delete(num)
    } else {
      cell.memos.add(num)
    }

    this.undoStack.push(action)
    this.redoStack = []

    return true
  }

  /**
   * 셀의 모든 메모 삭제
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @returns 성공 여부
   */
  clearMemos(row: number, col: number): boolean {
    const cell = this.grid[row][col]

    if (cell.isFixed || cell.memos.size === 0) return false

    const action: GameAction = {
      type: 'clearMemos',
      position: { row, col },
      previousMemos: new Set(cell.memos),
    }

    cell.memos.clear()

    this.undoStack.push(action)
    this.redoStack = []

    return true
  }

  /**
   * 마지막 액션 실행취소
   * @returns 성공 여부 (취소할 액션이 없으면 false)
   */
  undo(): boolean {
    const action = this.undoStack.pop()
    if (!action) return false

    const { row, col } = action.position
    const cell = this.grid[row][col]

    switch (action.type) {
      case 'setValue':
      case 'clearValue':
        cell.value = action.previousValue!
        if (action.previousMemos) {
          cell.memos = new Set(action.previousMemos)
        }
        break
      case 'toggleMemo':
        cell.memos = new Set(action.previousMemos)
        break
      case 'clearMemos':
        cell.memos = new Set(action.previousMemos)
        break
    }

    this.redoStack.push(action)
    return true
  }

  /**
   * 실행취소한 액션 재실행
   * @returns 성공 여부 (재실행할 액션이 없으면 false)
   */
  redo(): boolean {
    const action = this.redoStack.pop()
    if (!action) return false

    const { row, col } = action.position
    const cell = this.grid[row][col]

    switch (action.type) {
      case 'setValue':
        cell.value = action.newValue!
        cell.memos.clear()
        break
      case 'clearValue':
        cell.value = 0
        break
      case 'toggleMemo':
        if (cell.memos.has(action.memoValue!)) {
          cell.memos.delete(action.memoValue!)
        } else {
          cell.memos.add(action.memoValue!)
        }
        break
      case 'clearMemos':
        cell.memos.clear()
        break
    }

    this.undoStack.push(action)
    return true
  }

  /**
   * 힌트 받기
   * @returns 힌트 정보 (위치와 값) 또는 null
   */
  getHint(): { position: Position; value: number } | null {
    const board = this.cellGridToBoard()
    return getHint(board)
  }

  /**
   * 힌트를 받아서 보드에 적용
   * @returns 성공 여부
   */
  applyHint(): boolean {
    const hint = this.getHint()
    if (!hint) return false

    return this.setValue(
      hint.position.row,
      hint.position.col,
      hint.value as CellValue
    )
  }

  /**
   * 셀 정보 가져오기
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @returns 셀 정보 (값, 고정 여부, 메모)
   */
  getCell(row: number, col: number): Cell {
    return { ...this.grid[row][col], memos: new Set(this.grid[row][col].memos) }
  }

  /**
   * 현재 보드 상태 가져오기
   * @returns 9x9 보드 배열
   */
  getBoard(): Board {
    return this.cellGridToBoard()
  }

  /**
   * 전체 그리드 가져오기 (읽기 전용 복사본)
   * @returns 9x9 셀 그리드
   */
  getGrid(): CellGrid {
    return this.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        memos: new Set(cell.memos),
      }))
    )
  }

  /**
   * 정답 보드 가져오기
   * @returns 완성된 정답 보드
   */
  getSolution(): Board {
    return cloneBoard(this.solution)
  }

  /**
   * 현재 게임 난이도 가져오기
   * @returns 난이도 ('easy' | 'medium' | 'hard' | 'expert')
   */
  getDifficulty(): Difficulty {
    return this.difficulty
  }

  /**
   * 게임 완료 여부 확인 (모든 셀이 채워졌는지)
   * @returns 모든 셀이 채워졌으면 true
   */
  isCompleted(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.grid[row][col].value === 0) return false
      }
    }
    return true
  }

  /**
   * 퍼즐이 정답으로 완성되었는지 확인
   * @returns 정답이면 true
   */
  isSolved(): boolean {
    const board = this.cellGridToBoard()
    return isBoardSolved(board)
  }

  /**
   * 현재 보드 상태가 유효한지 확인 (규칙 위반 없는지)
   * @returns 규칙 위반이 없으면 true
   */
  isValid(): boolean {
    const board = this.cellGridToBoard()
    return isBoardValid(board)
  }

  /**
   * 특정 셀의 값이 정답인지 확인
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @returns 정답이면 true
   */
  checkCell(row: number, col: number): boolean {
    return this.grid[row][col].value === this.solution[row][col]
  }

  /**
   * 특정 셀과 충돌하는 셀들의 위치 가져오기
   * @param row - 행 인덱스 (0-8)
   * @param col - 열 인덱스 (0-8)
   * @returns 충돌하는 셀들의 위치 배열
   */
  getConflicts(row: number, col: number): Position[] {
    const board = this.cellGridToBoard()
    return getConflictingCells(board, row, col)
  }

  /**
   * 빈 셀 개수 가져오기
   * @returns 빈 셀의 개수
   */
  getEmptyCellCount(): number {
    let count = 0
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.grid[row][col].value === 0) count++
      }
    }
    return count
  }

  /**
   * 게임 진행률 가져오기
   * @returns 진행률 (0-100)
   */
  getProgress(): number {
    const total = 81
    const filled = total - this.getEmptyCellCount()
    return Math.round((filled / total) * 100)
  }

  /**
   * 실행취소 가능 여부 확인
   * @returns 실행취소할 액션이 있으면 true
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * 재실행 가능 여부 확인
   * @returns 재실행할 액션이 있으면 true
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * 게임을 초기 상태로 리셋
   * @description 사용자가 입력한 모든 값과 메모를 삭제하고, 실행취소 기록도 초기화
   */
  reset(): void {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = this.grid[row][col]
        if (!cell.isFixed) {
          cell.value = 0
          cell.memos.clear()
        }
      }
    }
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * 퍼즐 자동 풀이
   * @returns 항상 true
   */
  autoSolve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = this.grid[row][col]
        if (!cell.isFixed) {
          cell.value = this.solution[row][col]
          cell.memos.clear()
        }
      }
    }
    this.undoStack = []
    this.redoStack = []
    return true
  }

  private boardToCellGrid(board: Board): CellGrid {
    return board.map((row) =>
      row.map((value) => ({
        value,
        isFixed: value !== 0,
        memos: new Set<number>(),
      }))
    )
  }

  private cellGridToBoard(): Board {
    return this.grid.map((row) => row.map((cell) => cell.value))
  }
}
