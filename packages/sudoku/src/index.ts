export { SudokuEngine } from './sudoku'

export type {
  Board,
  Cell,
  CellGrid,
  CellValue,
  Difficulty,
  GameAction,
  GameState,
  Position,
} from './sudoku.types'
export { DIFFICULTY_CELLS_TO_REMOVE } from './sudoku.types'

export {
  generatePuzzle,
  generateQuickPuzzle,
  parseBoard,
  boardToString,
  formatBoard,
} from './sudoku.generator'
export type { GeneratedPuzzle } from './sudoku.generator'

export {
  solve,
  countSolutions,
  hasUniqueSolution,
  getHint,
  generateSolvedBoard,
} from './sudoku.solver'

export {
  createEmptyBoard,
  cloneBoard,
  isValidInRow,
  isValidInCol,
  isValidInBox,
  isValidPlacement,
  getPossibleNumbers,
  findEmptyCell,
  isBoardFilled,
  isBoardValid,
  isBoardSolved,
  getConflictingCells,
  shuffle,
} from './sudoku.utils'
