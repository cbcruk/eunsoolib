import { describe, expect, test, beforeEach } from 'vitest'
import { SudokuEngine } from './sudoku'
import {
  createEmptyBoard,
  isValidPlacement,
  isBoardValid,
  isBoardSolved,
  getPossibleNumbers,
} from './sudoku.utils'
import {
  solve,
  hasUniqueSolution,
  countSolutions,
  generateSolvedBoard,
  getHint,
} from './sudoku.solver'
import {
  generatePuzzle,
  generateQuickPuzzle,
  parseBoard,
  boardToString,
  formatBoard,
} from './sudoku.generator'
import type { Board, Difficulty } from './sudoku.types'
import { DIFFICULTY_CELLS_TO_REMOVE } from './sudoku.types'

// 테스트용 샘플 퍼즐
const SAMPLE_PUZZLE: Board = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

const SAMPLE_SOLUTION: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

describe('sudoku.utils', () => {
  test('createEmptyBoard는 9x9 빈 보드를 생성한다', () => {
    const board = createEmptyBoard()

    expect(board.length).toBe(9)
    expect(board[0].length).toBe(9)
    expect(board.flat().every((v) => v === 0)).toBe(true)
  })

  test('isValidPlacement는 유효한 배치를 검증한다', () => {
    const board = createEmptyBoard()
    board[0][0] = 5

    // 같은 행에 5를 놓을 수 없음
    expect(isValidPlacement(board, 0, 1, 5)).toBe(false)

    // 같은 열에 5를 놓을 수 없음
    expect(isValidPlacement(board, 1, 0, 5)).toBe(false)

    // 같은 3x3 박스에 5를 놓을 수 없음
    expect(isValidPlacement(board, 1, 1, 5)).toBe(false)

    // 다른 위치에 5를 놓을 수 있음
    expect(isValidPlacement(board, 3, 3, 5)).toBe(true)
  })

  test('getPossibleNumbers는 가능한 숫자들을 반환한다', () => {
    const possible = getPossibleNumbers(SAMPLE_PUZZLE, 0, 2)

    expect(possible).toContain(4)
    expect(possible).not.toContain(5)
    expect(possible).not.toContain(3)
  })

  test('isBoardValid는 유효한 보드를 검증한다', () => {
    expect(isBoardValid(SAMPLE_PUZZLE)).toBe(true)
    expect(isBoardValid(SAMPLE_SOLUTION)).toBe(true)

    // 잘못된 보드
    const invalid: Board = [...SAMPLE_PUZZLE.map((row) => [...row])]
    invalid[0][2] = 5 // 행에 5가 이미 있음
    expect(isBoardValid(invalid)).toBe(false)
  })

  test('isBoardSolved는 완성된 보드를 검증한다', () => {
    expect(isBoardSolved(SAMPLE_SOLUTION)).toBe(true)
    expect(isBoardSolved(SAMPLE_PUZZLE)).toBe(false)
  })
})

describe('sudoku.solver', () => {
  test('solve는 퍼즐을 풀 수 있다', () => {
    const solved = solve(SAMPLE_PUZZLE)

    expect(solved).not.toBeNull()
    expect(isBoardSolved(solved!)).toBe(true)
  })

  test('hasUniqueSolution은 유일해 여부를 확인한다', () => {
    expect(hasUniqueSolution(SAMPLE_PUZZLE)).toBe(true)
  })

  test('countSolutions는 해가 여러 개인 보드에서 maxCount까지 센다', () => {
    // 두 박스에 걸친 직사각형 네 칸(0·3행 × 3·4열, 6과 7이 서로 바뀔 수 있음)을 비우면 해가 둘이 된다
    const board = SAMPLE_SOLUTION.map((row) => [...row])
    board[0][3] = 0
    board[0][4] = 0
    board[3][3] = 0
    board[3][4] = 0

    expect(countSolutions(board)).toBe(2)
    expect(countSolutions(board, 5)).toBe(2)
    expect(countSolutions(board, 1)).toBe(1)
    expect(hasUniqueSolution(board)).toBe(false)
  })

  test('countSolutions는 풀 수 없는 보드에서 0을 반환한다', () => {
    const board = SAMPLE_PUZZLE.map((row) => [...row])
    board[0][2] = 5

    expect(countSolutions(board)).toBe(0)
  })

  test('getHint에 정답을 넘기면 잘못 입력한 값이 있어도 정답 기준 힌트를 준다', () => {
    const board = SAMPLE_SOLUTION.map((row) => [...row])
    board[0][2] = 0
    board[0][3] = 4 // 정답은 6. 이 값 때문에 (0, 2)에 넣을 수 있는 숫자가 없다

    expect(getHint(board)).toBeNull()
    expect(getHint(board, SAMPLE_SOLUTION)).toEqual({
      position: { row: 0, col: 2 },
      value: 4,
    })
  })

  test('generateSolvedBoard는 완성된 보드를 생성한다', () => {
    const board = generateSolvedBoard()

    expect(isBoardSolved(board)).toBe(true)
  })
})

describe('sudoku.generator', () => {
  test('generatePuzzle은 유효한 퍼즐을 생성한다', () => {
    const { puzzle, solution, difficulty } = generatePuzzle('easy')

    expect(isBoardValid(puzzle)).toBe(true)
    expect(isBoardSolved(solution)).toBe(true)
    expect(difficulty).toBe('easy')
    expect(hasUniqueSolution(puzzle)).toBe(true)
  })

  test.each(Object.keys(DIFFICULTY_CELLS_TO_REMOVE) as Difficulty[])(
    'generateQuickPuzzle은 %s 난이도에서 유일해 퍼즐을 생성한다',
    (difficulty) => {
      const { max } = DIFFICULTY_CELLS_TO_REMOVE[difficulty]

      for (let i = 0; i < 20; i++) {
        const { puzzle, solution, emptyCells } = generateQuickPuzzle(difficulty)
        const empty = puzzle.flat().filter((value) => value === 0).length

        expect(hasUniqueSolution(puzzle)).toBe(true)
        expect(solve(puzzle)).toEqual(solution)
        expect(emptyCells).toBe(empty)
        expect(emptyCells).toBeLessThanOrEqual(max)
      }
    },
  )

  test('parseBoard는 문자열에서 보드를 파싱한다', () => {
    const str =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
    const board = parseBoard(str)

    expect(board[0][0]).toBe(5)
    expect(board[0][2]).toBe(0)
    expect(board[8][8]).toBe(9)
  })

  test('boardToString은 보드를 문자열로 변환한다', () => {
    const str = boardToString(SAMPLE_PUZZLE)

    expect(str.length).toBe(81)
    expect(str[0]).toBe('5')
  })

  test('formatBoard는 보드를 보기 좋게 출력한다', () => {
    const formatted = formatBoard(SAMPLE_PUZZLE)

    expect(formatted).toContain('5 3 .')
    expect(formatted).toContain('------')
  })
})

describe('SudokuEngine', () => {
  let engine: SudokuEngine

  beforeEach(() => {
    engine = new SudokuEngine({
      puzzle: SAMPLE_PUZZLE,
      solution: SAMPLE_SOLUTION,
      difficulty: 'medium',
      emptyCells: 51,
    })
  })

  test('생성자가 정상적으로 동작한다', () => {
    expect(engine.getDifficulty()).toBe('medium')
    expect(engine.getEmptyCellCount()).toBe(51)
  })

  test('setValue로 값을 설정할 수 있다', () => {
    const result = engine.setValue(0, 2, 4)

    expect(result).toBe(true)
    expect(engine.getCell(0, 2).value).toBe(4)
  })

  test('고정된 셀은 수정할 수 없다', () => {
    const result = engine.setValue(0, 0, 1)

    expect(result).toBe(false)
    expect(engine.getCell(0, 0).value).toBe(5)
  })

  test('undo/redo가 정상적으로 동작한다', () => {
    engine.setValue(0, 2, 4)
    expect(engine.getCell(0, 2).value).toBe(4)

    engine.undo()
    expect(engine.getCell(0, 2).value).toBe(0)

    engine.redo()
    expect(engine.getCell(0, 2).value).toBe(4)
  })

  test('clearValue를 undo 후 redo하면 원래 clearValue처럼 메모도 지워진다', () => {
    engine.toggleMemo(0, 2, 4)
    engine.toggleMemo(0, 2, 6)
    engine.clearValue(0, 2)
    expect(engine.getCell(0, 2).memos.size).toBe(0)

    engine.undo()
    expect(engine.getCell(0, 2).memos.size).toBe(2)

    engine.redo()
    expect(engine.getCell(0, 2).value).toBe(0)
    expect(engine.getCell(0, 2).memos.size).toBe(0)
  })

  test('toggleMemo로 메모를 토글할 수 있다', () => {
    engine.toggleMemo(0, 2, 4)
    expect(engine.getCell(0, 2).memos.has(4)).toBe(true)

    engine.toggleMemo(0, 2, 4)
    expect(engine.getCell(0, 2).memos.has(4)).toBe(false)
  })

  test('값이 입력되면 메모가 삭제된다', () => {
    engine.toggleMemo(0, 2, 4)
    engine.toggleMemo(0, 2, 6)
    expect(engine.getCell(0, 2).memos.size).toBe(2)

    engine.setValue(0, 2, 4)
    expect(engine.getCell(0, 2).memos.size).toBe(0)
  })

  test('getHint는 힌트를 반환한다', () => {
    const hint = engine.getHint()

    expect(hint).not.toBeNull()
    expect(hint!.value).toBeGreaterThanOrEqual(1)
    expect(hint!.value).toBeLessThanOrEqual(9)
  })

  test('잘못 입력한 값 때문에 풀 수 없는 보드에서도 정답 기준 힌트를 준다', () => {
    engine.setValue(0, 2, 1) // 정답은 4, 1은 규칙 위반은 아니지만 풀 수 없게 만든다

    const hint = engine.getHint()

    expect(solve(engine.getBoard())).toBeNull()
    expect(hint).not.toBeNull()
    expect(hint!.value).toBe(
      SAMPLE_SOLUTION[hint!.position.row][hint!.position.col],
    )
  })

  test('잘못 입력한 칸만 남으면 그 칸의 정답을 힌트로 준다', () => {
    engine.autoSolve()
    engine.setValue(0, 2, 1)

    expect(engine.getHint()).toEqual({ position: { row: 0, col: 2 }, value: 4 })

    engine.applyHint()

    expect(engine.isSolved()).toBe(true)
    expect(engine.getHint()).toBeNull()
  })

  test('checkCell은 정답 여부를 확인한다', () => {
    engine.setValue(0, 2, 4)
    expect(engine.checkCell(0, 2)).toBe(true)

    engine.setValue(0, 2, 1)
    expect(engine.checkCell(0, 2)).toBe(false)
  })

  test('autoSolve는 퍼즐을 자동으로 푼다', () => {
    engine.autoSolve()

    expect(engine.isSolved()).toBe(true)
    expect(engine.isCompleted()).toBe(true)
  })

  test('reset은 게임을 초기 상태로 되돌린다', () => {
    engine.setValue(0, 2, 4)
    engine.setValue(0, 3, 6)
    engine.reset()

    expect(engine.getCell(0, 2).value).toBe(0)
    expect(engine.getCell(0, 3).value).toBe(0)
    expect(engine.canUndo()).toBe(false)
  })

  test('getProgress는 진행률을 반환한다', () => {
    const initialProgress = engine.getProgress()

    engine.setValue(0, 2, 4)
    const newProgress = engine.getProgress()

    expect(newProgress).toBeGreaterThan(initialProgress)
  })

  test('getConflicts는 충돌하는 셀을 반환한다', () => {
    engine.setValue(0, 2, 5) // 행에 이미 5가 있음
    const conflicts = engine.getConflicts(0, 2)

    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts.some((c) => c.row === 0 && c.col === 0)).toBe(true)
  })

  test('newGame은 새 게임을 시작한다', () => {
    const oldBoard = engine.getBoard()
    engine.newGame('hard')

    const newBoard = engine.getBoard()
    expect(engine.getDifficulty()).toBe('hard')
    expect(boardToString(oldBoard)).not.toBe(boardToString(newBoard))
  })

  test('loadPuzzle은 외부 퍼즐을 로드한다', () => {
    const customPuzzle = createEmptyBoard()
    customPuzzle[0][0] = 1
    customPuzzle[1][1] = 2

    engine.loadPuzzle(customPuzzle)

    expect(engine.getCell(0, 0).value).toBe(1)
    expect(engine.getCell(0, 0).isFixed).toBe(true)
    expect(engine.getCell(1, 1).value).toBe(2)
  })

  test('loadPuzzle은 풀 수 없는 보드를 로드하지 않고 기존 게임을 유지한다', () => {
    const unsolvable = SAMPLE_PUZZLE.map((row) => [...row])
    unsolvable[0][2] = 1 // 규칙 위반은 없지만 해가 없다

    expect(solve(unsolvable)).toBeNull()
    expect(engine.loadPuzzle(unsolvable)).toBe(false)
    expect(engine.getBoard()).toEqual(SAMPLE_PUZZLE)
    expect(engine.getSolution()).toEqual(SAMPLE_SOLUTION)
  })

  test('loadPuzzle은 주어진 숫자끼리 규칙을 어기는 보드를 로드하지 않는다', () => {
    const invalid = SAMPLE_PUZZLE.map((row) => [...row])
    invalid[0][2] = 5 // 같은 행에 5가 이미 있다

    expect(engine.loadPuzzle(invalid)).toBe(false)
    expect(engine.getBoard()).toEqual(SAMPLE_PUZZLE)
  })

  test('loadPuzzle은 성공하면 true를 반환하고 풀이를 정답으로 저장한다', () => {
    expect(engine.loadPuzzle(SAMPLE_PUZZLE)).toBe(true)
    expect(engine.getSolution()).toEqual(SAMPLE_SOLUTION)
  })
})
