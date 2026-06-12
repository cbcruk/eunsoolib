import type { Board, CellValue, Position } from './sudoku.types'
import {
  cloneBoard,
  findEmptyCell,
  getPossibleNumbers,
  isValidPlacement,
  shuffle,
} from './sudoku.utils'

/**
 * Backtracking 알고리즘을 사용한 스도쿠 풀이
 * @param board - 풀이할 스도쿠 보드
 * @returns 풀이된 보드 또는 null (풀이 불가능한 경우)
 */
export function solve(board: Board): Board | null {
  const result = cloneBoard(board)

  if (solveInPlace(result)) {
    return result
  }

  return null
}

function solveInPlace(board: Board): boolean {
  const emptyCell = findEmptyCell(board)

  if (!emptyCell) return true

  const { row, col } = emptyCell

  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num as CellValue

      if (solveInPlace(board)) {
        return true
      }

      board[row][col] = 0
    }
  }

  return false
}

/**
 * 스도쿠 퍼즐의 해의 개수 세기
 * @param board - 검사할 보드
 * @param maxCount - 최대 카운트 (기본값: 2, 유일해 확인용)
 * @returns 발견된 해의 개수 (maxCount 이상이면 maxCount 반환)
 */
export function countSolutions(board: Board, maxCount = 2): number {
  const result = cloneBoard(board)

  let count = 0

  function countSolve(): boolean {
    const emptyCell = findEmptyCell(result)

    if (!emptyCell) {
      count++
      return count >= maxCount
    }

    const { row, col } = emptyCell

    for (let num = 1; num <= 9; num++) {
      if (isValidPlacement(result, row, col, num)) {
        result[row][col] = num as CellValue

        if (countSolve()) {
          result[row][col] = 0
          return true
        }

        result[row][col] = 0
      }
    }

    return false
  }

  countSolve()

  return count
}

/**
 * 스도쿠 퍼즐이 유일한 해를 가지는지 확인
 * @param board - 검사할 보드
 * @returns 유일한 해가 있으면 true
 */
export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1
}

/**
 * 힌트 제공: 다음에 놓을 수 있는 확실한 숫자 찾기
 * @description 후보가 하나인 셀을 우선 찾고, 없으면 정답에서 첫 빈 셀의 값을 반환
 * @param board - 현재 보드 상태
 * @returns 힌트 정보 (위치와 값) 또는 null
 */
export function getHint(
  board: Board,
): { position: Position; value: number } | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const possible = getPossibleNumbers(board, row, col)

        if (possible.length === 1) {
          return { position: { row, col }, value: possible[0] }
        }
      }
    }
  }

  const solved = solve(board)

  if (solved) {
    const emptyCell = findEmptyCell(board)

    if (emptyCell) {
      return {
        position: emptyCell,
        value: solved[emptyCell.row][emptyCell.col],
      }
    }
  }

  return null
}

/**
 * 완성된 유효한 스도쿠 보드 생성
 * @returns 랜덤하게 생성된 완성 보드
 */
export function generateSolvedBoard(): Board {
  const board: Board = Array.from(
    { length: 9 },
    () => Array(9).fill(0) as CellValue[],
  )

  const firstRow = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])

  for (let col = 0; col < 9; col++) {
    board[0][col] = firstRow[col] as CellValue
  }

  fillBoardRandomly(board)

  return board
}

function fillBoardRandomly(board: Board): boolean {
  const emptyCell = findEmptyCell(board)

  if (!emptyCell) return true

  const { row, col } = emptyCell
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])

  for (const num of numbers) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num as CellValue

      if (fillBoardRandomly(board)) {
        return true
      }

      board[row][col] = 0
    }
  }

  return false
}
