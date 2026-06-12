import type { Board, CellValue, Position } from './sudoku.types'

/**
 * 빈 9x9 보드 생성
 * @returns 모든 셀이 0으로 채워진 9x9 보드
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0) as CellValue[])
}

/**
 * 보드 깊은 복사
 * @param board - 복사할 보드
 * @returns 복사된 새 보드
 */
export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

/**
 * 특정 행에서 숫자가 유효한지 확인
 * @param board - 검사할 보드
 * @param row - 행 인덱스 (0-8)
 * @param num - 확인할 숫자 (1-9)
 * @returns 해당 행에 숫자가 없으면 true
 */
export function isValidInRow(board: Board, row: number, num: number): boolean {
  return !board[row].includes(num as CellValue)
}

/**
 * 특정 열에서 숫자가 유효한지 확인
 * @param board - 검사할 보드
 * @param col - 열 인덱스 (0-8)
 * @param num - 확인할 숫자 (1-9)
 * @returns 해당 열에 숫자가 없으면 true
 */
export function isValidInCol(board: Board, col: number, num: number): boolean {
  for (let row = 0; row < 9; row++) {
    if (board[row][col] === num) return false
  }

  return true
}

/**
 * 특정 3x3 박스에서 숫자가 유효한지 확인
 * @param board - 검사할 보드
 * @param row - 행 인덱스 (0-8)
 * @param col - 열 인덱스 (0-8)
 * @param num - 확인할 숫자 (1-9)
 * @returns 해당 3x3 박스에 숫자가 없으면 true
 */
export function isValidInBox(
  board: Board,
  row: number,
  col: number,
  num: number,
): boolean {
  const boxStartRow = Math.floor(row / 3) * 3
  const boxStartCol = Math.floor(col / 3) * 3

  for (let r = boxStartRow; r < boxStartRow + 3; r++) {
    for (let c = boxStartCol; c < boxStartCol + 3; c++) {
      if (board[r][c] === num) return false
    }
  }

  return true
}

/**
 * 특정 위치에 숫자를 놓을 수 있는지 확인
 * @param board - 검사할 보드
 * @param row - 행 인덱스 (0-8)
 * @param col - 열 인덱스 (0-8)
 * @param num - 확인할 숫자 (1-9)
 * @returns 행, 열, 3x3 박스 모두에서 유효하면 true
 */
export function isValidPlacement(
  board: Board,
  row: number,
  col: number,
  num: number,
): boolean {
  return (
    isValidInRow(board, row, num) &&
    isValidInCol(board, col, num) &&
    isValidInBox(board, row, col, num)
  )
}

/**
 * 특정 위치에서 가능한 숫자들 반환
 * @param board - 검사할 보드
 * @param row - 행 인덱스 (0-8)
 * @param col - 열 인덱스 (0-8)
 * @returns 해당 위치에 놓을 수 있는 숫자 배열 (이미 값이 있으면 빈 배열)
 */
export function getPossibleNumbers(
  board: Board,
  row: number,
  col: number,
): number[] {
  if (board[row][col] !== 0) return []

  const possible: number[] = []

  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      possible.push(num)
    }
  }

  return possible
}

/**
 * 첫 번째 빈 셀 찾기
 * @param board - 검사할 보드
 * @returns 빈 셀의 위치 또는 null (모든 셀이 채워진 경우)
 */
export function findEmptyCell(board: Board): Position | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return { row, col }
      }
    }
  }
  return null
}

/**
 * 보드가 완전히 채워졌는지 확인
 * @param board - 검사할 보드
 * @returns 모든 셀이 채워졌으면 true
 */
export function isBoardFilled(board: Board): boolean {
  return findEmptyCell(board) === null
}

/**
 * 현재 보드 상태가 유효한지 확인 (규칙 위반 없는지)
 * @param board - 검사할 보드
 * @returns 모든 행, 열, 3x3 박스에서 중복이 없으면 true
 */
export function isBoardValid(board: Board): boolean {
  for (let row = 0; row < 9; row++) {
    const seen = new Set<number>()

    for (let col = 0; col < 9; col++) {
      const val = board[row][col]

      if (val !== 0) {
        if (seen.has(val)) return false

        seen.add(val)
      }
    }
  }

  for (let col = 0; col < 9; col++) {
    const seen = new Set<number>()

    for (let row = 0; row < 9; row++) {
      const val = board[row][col]

      if (val !== 0) {
        if (seen.has(val)) return false
        seen.add(val)
      }
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set<number>()

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const val = board[boxRow * 3 + r][boxCol * 3 + c]

          if (val !== 0) {
            if (seen.has(val)) return false

            seen.add(val)
          }
        }
      }
    }
  }

  return true
}

/**
 * 보드가 완성되고 유효한지 확인
 * @param board - 검사할 보드
 * @returns 모든 셀이 채워지고 규칙 위반이 없으면 true
 */
export function isBoardSolved(board: Board): boolean {
  return isBoardFilled(board) && isBoardValid(board)
}

/**
 * 특정 셀과 충돌하는 셀들의 위치 반환
 * @param board - 검사할 보드
 * @param row - 행 인덱스 (0-8)
 * @param col - 열 인덱스 (0-8)
 * @returns 같은 값을 가진 충돌 셀들의 위치 배열
 */
export function getConflictingCells(
  board: Board,
  row: number,
  col: number,
): Position[] {
  const value = board[row][col]

  if (value === 0) return []

  const conflicts: Position[] = []

  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === value) {
      conflicts.push({ row, col: c })
    }
  }

  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === value) {
      conflicts.push({ row: r, col })
    }
  }

  const boxStartRow = Math.floor(row / 3) * 3
  const boxStartCol = Math.floor(col / 3) * 3

  for (let r = boxStartRow; r < boxStartRow + 3; r++) {
    for (let c = boxStartCol; c < boxStartCol + 3; c++) {
      if (r !== row && c !== col && board[r][c] === value) {
        conflicts.push({ row: r, col: c })
      }
    }
  }

  return conflicts
}

/**
 * 배열 셔플 (Fisher-Yates 알고리즘)
 * @param array - 셔플할 배열
 * @returns 셔플된 새 배열
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
