import type { Board, CellValue, Difficulty, Position } from './sudoku.types'
import { DIFFICULTY_CELLS_TO_REMOVE } from './sudoku.types'
import { generateSolvedBoard, hasUniqueSolution } from './sudoku.solver'
import { cloneBoard, shuffle } from './sudoku.utils'

/**
 * 생성된 퍼즐 정보
 * @property puzzle - 빈 셀이 있는 퍼즐 보드
 * @property solution - 완성된 정답 보드
 * @property difficulty - 난이도
 * @property emptyCells - 빈 셀의 개수
 */
export interface GeneratedPuzzle {
  puzzle: Board
  solution: Board
  difficulty: Difficulty
  emptyCells: number
}

/**
 * 난이도에 따른 스도쿠 퍼즐 생성
 * @description 대칭 구조로 셀을 제거하여 미적으로 보기 좋은 퍼즐 생성, 유일해 보장
 * @param difficulty - 난이도 (기본값: 'medium')
 * @returns 생성된 퍼즐 정보
 */
export function generatePuzzle(
  difficulty: Difficulty = 'medium',
): GeneratedPuzzle {
  const solution = generateSolvedBoard()
  const puzzle = cloneBoard(solution)

  const { min, max } = DIFFICULTY_CELLS_TO_REMOVE[difficulty]
  const targetEmpty = min + Math.floor(Math.random() * (max - min + 1))

  const positions = generateSymmetricPositions()
  const shuffledPositions = shuffle(positions)

  let emptyCells = 0

  for (const pos of shuffledPositions) {
    if (emptyCells >= targetEmpty) break

    const { row, col } = pos
    const mirrorRow = 8 - row
    const mirrorCol = 8 - col

    if (puzzle[row][col] === 0) continue

    const value1 = puzzle[row][col]
    const value2 = puzzle[mirrorRow][mirrorCol]

    puzzle[row][col] = 0
    emptyCells++

    if (row !== mirrorRow || col !== mirrorCol) {
      if (puzzle[mirrorRow][mirrorCol] !== 0) {
        puzzle[mirrorRow][mirrorCol] = 0
        emptyCells++
      }
    }

    if (!hasUniqueSolution(puzzle)) {
      puzzle[row][col] = value1
      emptyCells--

      if (row !== mirrorRow || col !== mirrorCol) {
        puzzle[mirrorRow][mirrorCol] = value2
        if (value2 !== 0) emptyCells--
      }
    }

    if (emptyCells >= targetEmpty) break
  }

  return {
    puzzle,
    solution,
    difficulty,
    emptyCells,
  }
}

function generateSymmetricPositions(): Position[] {
  const positions: Position[] = []

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (row < 4 || (row === 4 && col <= 4)) {
        positions.push({ row, col })
      }
    }
  }

  return positions
}

/**
 * 빠른 퍼즐 생성 (유일해 체크 최소화)
 * @description 40셀 이상 비워지기 전까지는 유일해 체크를 생략하여 빠르게 생성
 * @param difficulty - 난이도 (기본값: 'medium')
 * @returns 생성된 퍼즐 정보
 */
export function generateQuickPuzzle(
  difficulty: Difficulty = 'medium',
): GeneratedPuzzle {
  const solution = generateSolvedBoard()
  const puzzle = cloneBoard(solution)

  const { min, max } = DIFFICULTY_CELLS_TO_REMOVE[difficulty]
  const targetEmpty = min + Math.floor(Math.random() * (max - min + 1))

  const allPositions: Position[] = []

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      allPositions.push({ row, col })
    }
  }

  const shuffledPositions = shuffle(allPositions)

  let emptyCells = 0

  for (const { row, col } of shuffledPositions) {
    if (emptyCells >= targetEmpty) break

    const value = puzzle[row][col]

    puzzle[row][col] = 0

    if (emptyCells > 40) {
      if (!hasUniqueSolution(puzzle)) {
        puzzle[row][col] = value
        continue
      }
    }

    emptyCells++
  }

  return {
    puzzle,
    solution,
    difficulty,
    emptyCells,
  }
}

/**
 * 문자열에서 보드 파싱
 * @param str - 81자리 숫자 문자열 (빈 셀은 0 또는 .)
 * @returns 파싱된 9x9 보드
 * @throws 81자리가 아닌 경우 에러
 */
export function parseBoard(str: string): Board {
  const digits = str.replace(/[^0-9.]/g, '').replace(/\./g, '0')

  if (digits.length !== 81) {
    throw new Error('Invalid board string: must contain exactly 81 digits')
  }

  const board: Board = []

  for (let row = 0; row < 9; row++) {
    const rowArr: CellValue[] = []

    for (let col = 0; col < 9; col++) {
      rowArr.push(parseInt(digits[row * 9 + col]) as CellValue)
    }

    board.push(rowArr)
  }

  return board
}

/**
 * 보드를 문자열로 변환
 * @param board - 변환할 보드
 * @returns 81자리 숫자 문자열
 */
export function boardToString(board: Board): string {
  return board.map((row) => row.join('')).join('')
}

/**
 * 보드를 보기 좋게 포맷팅
 * @param board - 포맷팅할 보드
 * @returns 3x3 박스 구분선이 포함된 문자열
 */
export function formatBoard(board: Board): string {
  let result = ''

  for (let row = 0; row < 9; row++) {
    if (row % 3 === 0 && row !== 0) {
      result += '------+-------+------\n'
    }

    for (let col = 0; col < 9; col++) {
      if (col % 3 === 0 && col !== 0) {
        result += ' | '
      } else if (col !== 0) {
        result += ' '
      }

      result += board[row][col] === 0 ? '.' : board[row][col].toString()
    }

    result += '\n'
  }

  return result
}
