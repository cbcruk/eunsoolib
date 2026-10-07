export { MinesweeperEngine } from './minesweeper'

export type {
  Board,
  BoardConfig,
  Cell,
  CellState,
  Difficulty,
  GameStatus,
  MinesweeperOptions,
  Position,
} from './minesweeper.types'

export { DIFFICULTY_CONFIGS } from './minesweeper.constants'

export {
  createEmptyBoard,
  getNeighbors,
  layMines,
  pickMinePositions,
  resolveConfig,
} from './minesweeper.utils'
