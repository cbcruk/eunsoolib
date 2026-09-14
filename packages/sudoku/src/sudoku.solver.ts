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
 * @description 행·열·박스에 쓰인 숫자를 비트마스크로 추적하고, 매 단계 후보가 가장 적은 빈 칸부터 채워
 * 칸을 많이 비운 보드에서도 빠르게 센다.
 * @param board - 검사할 보드
 * @param maxCount - 최대 카운트 (기본값: 2, 유일해 확인용)
 * @returns 발견된 해의 개수 (maxCount 이상이면 maxCount 반환)
 */
export function countSolutions(board: Board, maxCount = 2): number {
  const rowMasks = new Array<number>(9).fill(0)
  const colMasks = new Array<number>(9).fill(0)
  const boxMasks = new Array<number>(9).fill(0)
  const emptyCells: number[] = []

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = board[row][col]

      if (value === 0) {
        emptyCells.push(row * 9 + col)
        continue
      }

      const bit = 1 << value

      rowMasks[row] |= bit
      colMasks[col] |= bit
      boxMasks[boxIndex(row, col)] |= bit
    }
  }

  let count = 0

  function candidatesOf(cell: number): number {
    const row = Math.floor(cell / 9)
    const col = cell % 9

    return (
      ~(rowMasks[row] | colMasks[col] | boxMasks[boxIndex(row, col)]) &
      ALL_DIGITS_MASK
    )
  }

  function countSolve(depth: number): boolean {
    if (depth === emptyCells.length) {
      count++
      return count >= maxCount
    }

    let bestIndex = depth
    let bestCandidates = 0
    let bestSize = 10

    for (let i = depth; i < emptyCells.length; i++) {
      const candidates = candidatesOf(emptyCells[i])
      const size = bitCount(candidates)

      if (size < bestSize) {
        bestIndex = i
        bestCandidates = candidates
        bestSize = size

        if (size <= 1) break
      }
    }

    if (bestSize === 0) return false

    const cell = emptyCells[bestIndex]

    emptyCells[bestIndex] = emptyCells[depth]
    emptyCells[depth] = cell

    const row = Math.floor(cell / 9)
    const col = cell % 9
    const box = boxIndex(row, col)
    let remaining = bestCandidates

    while (remaining !== 0) {
      const bit = remaining & -remaining

      remaining ^= bit
      rowMasks[row] |= bit
      colMasks[col] |= bit
      boxMasks[box] |= bit

      const done = countSolve(depth + 1)

      rowMasks[row] ^= bit
      colMasks[col] ^= bit
      boxMasks[box] ^= bit

      if (done) return true
    }

    return false
  }

  countSolve(0)

  return count
}

const ALL_DIGITS_MASK = 0b1111111110

function boxIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3)
}

function bitCount(mask: number): number {
  let size = 0

  for (let rest = mask; rest !== 0; rest &= rest - 1) size++

  return size
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
 * @description `solution`이 없으면 후보가 하나인 셀을 우선 찾고, 없으면 현재 보드를 풀어 첫 빈 셀의 값을 반환한다.
 * `solution`을 넘기면 정답과 다른 값이 들어 있는 칸도 빈 칸처럼 다루고, 값은 항상 `solution`에서 가져온다.
 * 이때 정답과 일치하는 값만 남긴 보드에서 후보가 하나인 칸을 우선 고르고, 없으면 첫 번째 빈 칸이나 틀린 칸을 고른다.
 * 따라서 잘못 입력한 값이 있어도 null이 되거나 어긋난 힌트가 나오지 않는다.
 * @param board - 현재 보드 상태
 * @param solution - 정답 보드. 넘기면 힌트를 정답 기준으로 계산한다
 * @returns 힌트 정보 (위치와 값) 또는 null (채울 칸이 없거나, `solution` 없이 풀 수 없는 경우)
 */
export function getHint(
  board: Board,
  solution?: Board,
): { position: Position; value: number } | null {
  if (solution) {
    return getHintFromSolution(board, solution)
  }

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

function getHintFromSolution(
  board: Board,
  solution: Board,
): { position: Position; value: number } | null {
  const correctBoard = board.map((cells, row) =>
    cells.map((value, col) => (value === solution[row][col] ? value : 0)),
  )

  let fallback: Position | null = null

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (correctBoard[row][col] !== 0) continue

      if (getPossibleNumbers(correctBoard, row, col).length === 1) {
        return { position: { row, col }, value: solution[row][col] }
      }

      if (!fallback) fallback = { row, col }
    }
  }

  if (!fallback) return null

  return {
    position: fallback,
    value: solution[fallback.row][fallback.col],
  }
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
