import { MinesweeperEngine } from './minesweeper'
import {
  createEmptyBoard,
  getNeighbors,
  layMines,
  pickMinePositions,
  resolveConfig,
} from './minesweeper.utils'

function createClock(start = 1000): {
  now: () => number
  tick: (ms: number) => void
} {
  let time = start
  return {
    now: () => time,
    tick: (ms) => {
      time += ms
    },
  }
}

describe('minesweeper.utils', () => {
  test('resolveConfig는 난이도 이름을 보드 설정으로 바꾼다', () => {
    expect(resolveConfig('expert')).toEqual({ rows: 16, cols: 30, mines: 99 })
  })

  test('resolveConfig는 지뢰 수가 전체 칸 수 이상이면 에러를 던진다', () => {
    expect(() => resolveConfig({ rows: 2, cols: 2, mines: 4 })).toThrow()
    expect(() => resolveConfig({ rows: 0, cols: 2, mines: 0 })).toThrow()
    expect(() => resolveConfig({ rows: 2, cols: 2, mines: -1 })).toThrow()
  })

  test('getNeighbors는 모서리에서 3칸, 가운데에서 8칸을 반환한다', () => {
    expect(getNeighbors({ row: 0, col: 0 }, 3, 3)).toHaveLength(3)
    expect(getNeighbors({ row: 1, col: 1 }, 3, 3)).toHaveLength(8)
  })

  test('pickMinePositions는 제외 칸을 피해 중복 없이 지뢰를 고른다', () => {
    const exclude = [
      { row: 0, col: 0 },
      ...getNeighbors({ row: 0, col: 0 }, 5, 5),
    ]
    const positions = pickMinePositions(
      { rows: 5, cols: 5, mines: 21 },
      exclude,
    )
    const keys = new Set(positions.map((p) => `${p.row},${p.col}`))

    expect(keys.size).toBe(21)
    expect(keys.has('0,0')).toBe(false)
    expect(keys.has('1,1')).toBe(false)
  })

  test('pickMinePositions는 제외 후 칸이 모자라면 전체 칸에서 고른다', () => {
    const positions = pickMinePositions({ rows: 2, cols: 2, mines: 3 }, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])

    expect(positions).toHaveLength(3)
  })

  test('layMines는 주변 지뢰 수를 계산한다', () => {
    const board = createEmptyBoard(3, 3)
    layMines(board, [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    ])

    expect(board[0][1].adjacentMines).toBe(2)
    expect(board[1][1].adjacentMines).toBe(2)
    expect(board[2][1].adjacentMines).toBe(0)
  })
})

describe('MinesweeperEngine', () => {
  test('기본 난이도는 beginner이고 시작 상태는 ready이다', () => {
    const engine = new MinesweeperEngine()

    expect(engine.getConfig()).toEqual({ rows: 9, cols: 9, mines: 10 })
    expect(engine.getStatus()).toBe('ready')
    expect(engine.getRemainingMines()).toBe(10)
  })

  test('첫 칸과 그 주변에는 지뢰가 배치되지 않는다', () => {
    for (let i = 0; i < 20; i++) {
      const engine = new MinesweeperEngine({ config: 'expert' })
      engine.reveal(5, 5)

      expect(engine.getStatus()).toBe('playing')
      expect(engine.getCell(5, 5).adjacentMines).toBe(0)
      for (const n of getNeighbors({ row: 5, col: 5 }, 16, 30)) {
        expect(engine.getCell(n.row, n.col).isMine).toBe(false)
      }
    }
  })

  test('빈 칸을 열면 이어진 칸을 연쇄로 열고, 안전한 칸을 모두 열면 승리한다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    const opened = engine.reveal(2, 2)

    expect(opened).toHaveLength(8)
    expect(engine.getRevealedCount()).toBe(8)
    expect(engine.getStatus()).toBe('won')
    expect(engine.getCell(0, 0).state).toBe('flagged')
    expect(engine.getRemainingMines()).toBe(0)
  })

  test('숫자 칸을 열면 그 칸만 열린다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    expect(engine.reveal(1, 1)).toEqual([{ row: 1, col: 1 }])
    expect(engine.getCell(1, 1).adjacentMines).toBe(1)
    expect(engine.getStatus()).toBe('playing')
  })

  test('지뢰를 열면 패배하고 모든 지뢰가 드러난다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 2 },
      minePositions: [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
      ],
    })

    engine.reveal(0, 0)

    expect(engine.getStatus()).toBe('lost')
    expect(engine.getExplodedPosition()).toEqual({ row: 0, col: 0 })
    expect(engine.getCell(2, 2).state).toBe('revealed')
    expect(engine.reveal(1, 1)).toEqual([])
  })

  test('깃발을 꽂은 칸은 열리지 않고, 남은 지뢰 수가 줄어든다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    expect(engine.toggleFlag(0, 0)).toBe(true)
    expect(engine.getRemainingMines()).toBe(0)
    expect(engine.reveal(0, 0)).toEqual([])

    expect(engine.toggleFlag(0, 0)).toBe(true)
    expect(engine.getCell(0, 0).state).toBe('hidden')
    expect(engine.getRemainingMines()).toBe(1)
  })

  test('열린 칸에는 깃발을 꽂을 수 없다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    engine.reveal(1, 1)

    expect(engine.toggleFlag(1, 1)).toBe(false)
  })

  test('chord는 깃발 수가 숫자와 같을 때 주변 닫힌 칸을 연다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 4, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    engine.reveal(1, 1)

    expect(engine.chord(1, 1)).toEqual([])

    engine.toggleFlag(0, 0)
    const opened = engine.chord(1, 1)

    expect(opened.length).toBeGreaterThan(0)
    expect(engine.getStatus()).toBe('won')
  })

  test('chord는 깃발을 잘못 꽂았으면 지뢰를 열어 패배한다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    engine.reveal(1, 1)
    engine.toggleFlag(0, 1)
    engine.chord(1, 1)

    expect(engine.getStatus()).toBe('lost')
  })

  test('경과 시간은 첫 칸을 열 때 시작해 게임이 끝나면 멈춘다', () => {
    const clock = createClock()
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 2 },
      minePositions: [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
      ],
      now: clock.now,
    })

    clock.tick(500)
    expect(engine.getElapsedTime()).toBe(0)

    engine.reveal(1, 1)
    clock.tick(3000)
    expect(engine.getElapsedTime()).toBe(3000)

    engine.reveal(0, 0)
    clock.tick(5000)
    expect(engine.getElapsedTime()).toBe(3000)
  })

  test('newGame은 상태를 초기화하고 설정을 바꾼다', () => {
    const engine = new MinesweeperEngine({
      config: { rows: 3, cols: 3, mines: 1 },
      minePositions: [{ row: 0, col: 0 }],
    })

    engine.reveal(0, 0)
    engine.newGame('intermediate')

    expect(engine.getStatus()).toBe('ready')
    expect(engine.getConfig()).toEqual({ rows: 16, cols: 16, mines: 40 })
    expect(engine.getExplodedPosition()).toBeNull()
    expect(engine.getElapsedTime()).toBe(0)
    expect(
      engine
        .getBoard()
        .flat()
        .every((c) => !c.isMine),
    ).toBe(true)
  })

  test('범위 밖이나 중복된 지뢰 위치는 에러를 던진다', () => {
    expect(
      () =>
        new MinesweeperEngine({
          config: { rows: 3, cols: 3, mines: 1 },
          minePositions: [{ row: 3, col: 0 }],
        }),
    ).toThrow()
    expect(
      () =>
        new MinesweeperEngine({
          config: { rows: 3, cols: 3, mines: 2 },
          minePositions: [
            { row: 0, col: 0 },
            { row: 0, col: 0 },
          ],
        }),
    ).toThrow()
  })

  test('getBoard는 복사본을 반환한다', () => {
    const engine = new MinesweeperEngine()
    const board = engine.getBoard()

    board[0][0].state = 'revealed'

    expect(engine.getCell(0, 0).state).toBe('hidden')
  })
})
