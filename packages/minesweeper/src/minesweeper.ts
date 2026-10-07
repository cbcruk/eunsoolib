import type {
  Board,
  BoardConfig,
  Cell,
  Difficulty,
  GameStatus,
  MinesweeperOptions,
  Position,
} from './minesweeper.types'
import {
  createEmptyBoard,
  getNeighbors,
  layMines,
  pickMinePositions,
  resolveConfig,
} from './minesweeper.utils'

/**
 * 지뢰찾기 게임 엔진.
 *
 * 칸 열기·연쇄 열기·깃발·코드(chord)·승패 판정·경과 시간을 관리한다. 지뢰 위치를 직접 주지 않으면
 * 첫 칸을 열 때 그 칸과 주변 8칸을 피해 지뢰를 배치하므로 첫 클릭은 항상 안전하다.
 *
 * @example
 * ```ts
 * import { MinesweeperEngine } from '@cbcruk/minesweeper'
 *
 * const engine = new MinesweeperEngine({ config: 'beginner' })
 *
 * engine.reveal(4, 4)
 * engine.toggleFlag(0, 0)
 * engine.getStatus() // 'playing'
 * ```
 */
export class MinesweeperEngine {
  private config: BoardConfig
  private board: Board
  private status: GameStatus = 'ready'
  private minesLaid = false
  private revealedCount = 0
  private flagCount = 0
  private explodedAt: Position | null = null
  private startedAt: number | null = null
  private endedAt: number | null = null
  private readonly random: () => number
  private readonly now: () => number

  /**
   * @throws 보드 설정이 잘못됐거나 `minePositions`에 범위 밖·중복 위치가 있을 때
   */
  constructor(options: MinesweeperOptions = {}) {
    this.random = options.random ?? Math.random
    this.now = options.now ?? Date.now

    const base = resolveConfig(options.config ?? 'beginner')

    if (options.minePositions) {
      const positions = options.minePositions
      this.config = resolveConfig({ ...base, mines: positions.length })
      this.board = createEmptyBoard(this.config.rows, this.config.cols)
      this.assertMinePositions(positions)
      layMines(this.board, positions)
      this.minesLaid = true
    } else {
      this.config = base
      this.board = createEmptyBoard(base.rows, base.cols)
    }
  }

  /**
   * 새 판을 시작한다.
   *
   * 지뢰는 첫 칸을 열 때 무작위로 배치한다.
   *
   * @param config - 난이도 이름 또는 보드 설정. 없으면 현재 설정을 그대로 쓴다
   * @throws 보드 설정이 잘못됐을 때
   */
  newGame(config: Difficulty | BoardConfig = this.config): void {
    this.config = resolveConfig(config)
    this.board = createEmptyBoard(this.config.rows, this.config.cols)
    this.status = 'ready'
    this.minesLaid = false
    this.revealedCount = 0
    this.flagCount = 0
    this.explodedAt = null
    this.startedAt = null
    this.endedAt = null
  }

  /**
   * 칸을 연다.
   *
   * 주변 지뢰가 0인 칸을 열면 이어진 빈 칸과 그 경계의 숫자 칸까지 연쇄로 연다. 지뢰를 열면
   * 패배하고 깃발이 없는 지뢰를 모두 드러낸다.
   *
   * @returns 이번 호출로 새로 열린 칸의 위치. 범위 밖·이미 열림·깃발·게임 종료면 빈 배열
   */
  reveal(row: number, col: number): Position[] {
    if (this.isOver() || !this.isInBounds(row, col)) return []
    if (this.board[row][col].state !== 'hidden') return []

    if (this.status === 'ready') this.start({ row, col })

    return this.open([{ row, col }])
  }

  /**
   * 닫힌 칸의 깃발을 꽂거나 뽑는다.
   *
   * @returns 상태가 바뀌었는지 여부. 열린 칸·범위 밖·게임 종료면 `false`
   */
  toggleFlag(row: number, col: number): boolean {
    if (this.isOver() || !this.isInBounds(row, col)) return false

    const cell = this.board[row][col]

    if (cell.state === 'revealed') return false

    if (cell.state === 'flagged') {
      cell.state = 'hidden'
      this.flagCount--
    } else {
      cell.state = 'flagged'
      this.flagCount++
    }

    return true
  }

  /**
   * 열린 숫자 칸 주변의 닫힌 칸을 한 번에 연다 (코드, chord).
   *
   * 주변 깃발 수가 칸의 숫자와 같을 때만 동작한다. 깃발을 잘못 꽂았다면 지뢰가 열려 패배한다.
   *
   * @returns 새로 열린 칸의 위치. 조건이 맞지 않으면 빈 배열
   */
  chord(row: number, col: number): Position[] {
    if (this.isOver() || !this.isInBounds(row, col)) return []

    const cell = this.board[row][col]

    if (cell.state !== 'revealed' || cell.adjacentMines === 0) return []

    const neighbors = this.neighborsOf({ row, col })
    const flags = neighbors.filter(
      (n) => this.board[n.row][n.col].state === 'flagged',
    ).length

    if (flags !== cell.adjacentMines) return []

    return this.open(
      neighbors.filter((n) => this.board[n.row][n.col].state === 'hidden'),
    )
  }

  /** 칸 정보의 복사본을 반환한다. */
  getCell(row: number, col: number): Cell {
    return { ...this.board[row][col] }
  }

  /**
   * 보드 전체의 복사본을 반환한다.
   *
   * 닫힌 칸의 `isMine`·`adjacentMines`도 그대로 들어 있으므로, 화면에는 `state`가
   * `revealed`인 칸의 정보만 보여줘야 한다.
   */
  getBoard(): Board {
    return this.board.map((row) => row.map((cell) => ({ ...cell })))
  }

  /** 현재 보드 설정을 반환한다. */
  getConfig(): BoardConfig {
    return { ...this.config }
  }

  /** 게임 진행 상태를 반환한다. */
  getStatus(): GameStatus {
    return this.status
  }

  /**
   * 남은 지뢰 수 표시값(전체 지뢰 수 − 깃발 수)을 반환한다.
   *
   * @returns 깃발을 지뢰보다 많이 꽂으면 음수
   */
  getRemainingMines(): number {
    return this.config.mines - this.flagCount
  }

  /** 지금까지 연 안전한 칸 수를 반환한다. 점수로 쓸 수 있다. */
  getRevealedCount(): number {
    return this.revealedCount
  }

  /**
   * 첫 칸을 연 뒤 흐른 시간(ms)을 반환한다.
   *
   * @returns 시작 전이면 `0`, 게임이 끝났으면 끝난 시점까지의 시간
   */
  getElapsedTime(): number {
    if (this.startedAt === null) return 0

    return (this.endedAt ?? this.now()) - this.startedAt
  }

  /**
   * 패배를 일으킨 지뢰의 위치를 반환한다.
   *
   * @returns 패배하지 않았으면 `null`
   */
  getExplodedPosition(): Position | null {
    return this.explodedAt ? { ...this.explodedAt } : null
  }

  /** 게임이 승리나 패배로 끝났는지 확인한다. */
  isOver(): boolean {
    return this.status === 'won' || this.status === 'lost'
  }

  private start(first: Position): void {
    if (!this.minesLaid) {
      const exclude = [first, ...this.neighborsOf(first)]
      layMines(this.board, pickMinePositions(this.config, exclude, this.random))
      this.minesLaid = true
    }

    this.status = 'playing'
    this.startedAt = this.now()
  }

  private open(targets: Position[]): Position[] {
    const opened: Position[] = []
    const queue = [...targets]

    while (queue.length > 0) {
      const pos = queue.shift()!
      const cell = this.board[pos.row][pos.col]

      if (cell.state !== 'hidden') continue

      cell.state = 'revealed'
      opened.push(pos)

      if (cell.isMine) {
        this.lose(pos)
        return opened
      }

      this.revealedCount++

      if (cell.adjacentMines === 0) queue.push(...this.neighborsOf(pos))
    }

    const { rows, cols, mines } = this.config

    if (this.revealedCount === rows * cols - mines) this.win()

    return opened
  }

  private lose(at: Position): void {
    this.status = 'lost'
    this.explodedAt = at
    this.endedAt = this.now()

    for (const row of this.board) {
      for (const cell of row) {
        if (cell.isMine && cell.state === 'hidden') cell.state = 'revealed'
      }
    }
  }

  private win(): void {
    this.status = 'won'
    this.endedAt = this.now()

    for (const row of this.board) {
      for (const cell of row) {
        if (cell.isMine && cell.state !== 'flagged') {
          cell.state = 'flagged'
          this.flagCount++
        }
      }
    }
  }

  private neighborsOf(pos: Position): Position[] {
    return getNeighbors(pos, this.config.rows, this.config.cols)
  }

  private isInBounds(row: number, col: number): boolean {
    return (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      row < this.config.rows &&
      col >= 0 &&
      col < this.config.cols
    )
  }

  private assertMinePositions(positions: Position[]): void {
    const seen = new Set<number>()

    for (const { row, col } of positions) {
      if (!this.isInBounds(row, col)) {
        throw new Error(`mine position out of bounds: ${row},${col}`)
      }

      const key = row * this.config.cols + col

      if (seen.has(key)) {
        throw new Error(`duplicate mine position: ${row},${col}`)
      }

      seen.add(key)
    }
  }
}
