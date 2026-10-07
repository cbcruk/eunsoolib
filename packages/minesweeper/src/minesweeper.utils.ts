import { DIFFICULTY_CONFIGS } from './minesweeper.constants'
import type {
  Board,
  BoardConfig,
  Difficulty,
  Position,
} from './minesweeper.types'

/**
 * 난이도 이름이나 보드 설정을 검증된 {@link BoardConfig}로 바꾼다.
 *
 * @throws 행·열이 1 미만인 정수가 아니거나, 지뢰 수가 0 미만이거나 전체 칸 수 이상일 때
 */
export function resolveConfig(config: Difficulty | BoardConfig): BoardConfig {
  const resolved =
    typeof config === 'string' ? DIFFICULTY_CONFIGS[config] : config
  const { rows, cols, mines } = resolved

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new Error('rows and cols must be integers')
  }

  if (rows < 1 || cols < 1) {
    throw new Error('rows and cols must be at least 1')
  }

  if (!Number.isInteger(mines) || mines < 0 || mines >= rows * cols) {
    throw new Error('mines must be an integer between 0 and rows * cols - 1')
  }

  return { rows, cols, mines }
}

/** 지뢰 없이 모든 칸이 닫힌 보드를 만든다. */
export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      adjacentMines: 0,
      state: 'hidden' as const,
    })),
  )
}

/** 보드 범위 안에 있는 주변 최대 8칸의 위치를 반환한다. */
export function getNeighbors(
  { row, col }: Position,
  rows: number,
  cols: number,
): Position[] {
  const neighbors: Position[] = []

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue

      const r = row + dr
      const c = col + dc

      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        neighbors.push({ row: r, col: c })
      }
    }
  }

  return neighbors
}

/**
 * 제외할 칸을 피해 지뢰 위치를 무작위로 고른다.
 *
 * 제외 칸 때문에 남은 칸이 지뢰 수보다 적으면 제외 목록을 무시하고 전체 칸에서 고른다.
 *
 * @param exclude - 지뢰를 두지 않을 칸 (첫 클릭 칸과 그 주변)
 * @param random - `[0, 1)` 난수 함수
 */
export function pickMinePositions(
  { rows, cols, mines }: BoardConfig,
  exclude: Position[] = [],
  random: () => number = Math.random,
): Position[] {
  const excluded = new Set(exclude.map(({ row, col }) => row * cols + col))
  const all = Array.from({ length: rows * cols }, (_, i) => i)
  const allowed = all.filter((i) => !excluded.has(i))
  const candidates = allowed.length >= mines ? allowed : all

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))

    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates
    .slice(0, mines)
    .map((i) => ({ row: Math.floor(i / cols), col: i % cols }))
}

/** 보드에 지뢰를 놓고 모든 칸의 주변 지뢰 수를 다시 계산한다. 보드를 직접 수정한다. */
export function layMines(board: Board, positions: Position[]): void {
  const rows = board.length
  const cols = board[0]?.length ?? 0

  for (const { row, col } of positions) {
    board[row][col].isMine = true
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      board[row][col].adjacentMines = getNeighbors(
        { row, col },
        rows,
        cols,
      ).filter((n) => board[n.row][n.col].isMine).length
    }
  }
}
