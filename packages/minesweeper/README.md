# @cbcruk/minesweeper

지뢰찾기 게임 엔진 (지뢰 배치·연쇄 열기·깃발·타이머)입니다.

[101 Computing의 Minesweeper in JavaScript](https://www.101computing.net/minesweeper-in-javascript/)를 UI 없이 규칙만 모델링한 설계 실험입니다. 원문 과제에서 제안한 점수(연 칸 수)·오른쪽 클릭 깃발·난이도 설정·타이머를 엔진 기능으로 담았습니다. 렌더링과 입력 처리는 쓰는 쪽이 담당합니다.

## 설치

```bash
pnpm add @cbcruk/minesweeper
```

## 사용법

### 게임 엔진

```ts
import { MinesweeperEngine } from '@cbcruk/minesweeper'

const engine = new MinesweeperEngine({ config: 'beginner' }) // 9x9, 지뢰 10개

engine.reveal(4, 4) // 첫 클릭은 항상 안전, 새로 열린 칸의 Position[]
engine.toggleFlag(0, 0) // 오른쪽 클릭
engine.chord(3, 3) // 숫자 칸 더블 클릭: 깃발 수가 맞으면 주변을 연다

engine.getStatus() // 'ready' | 'playing' | 'won' | 'lost'
engine.getRemainingMines() // 지뢰 수 − 깃발 수
engine.getRevealedCount() // 점수
engine.getElapsedTime() // ms
```

### 판 재현

지뢰 위치를 직접 넘기면 첫 클릭 보호 없이 그 배치를 그대로 씁니다. 테스트나 공유된 판을 재현할 때 씁니다.

```ts
import { MinesweeperEngine } from '@cbcruk/minesweeper'

const engine = new MinesweeperEngine({
  config: { rows: 3, cols: 3, mines: 1 },
  minePositions: [{ row: 0, col: 0 }],
})

engine.reveal(2, 2) // 빈 칸이라 8칸이 연쇄로 열리고 승리
```

## API

### 타입

- `Position` = `{ row, col }`
- `CellState` = `'hidden' | 'revealed' | 'flagged'`
- `Cell` = `{ isMine, adjacentMines, state }`, `Board` = `Cell[][]`
- `GameStatus` = `'ready' | 'playing' | 'won' | 'lost'`
- `Difficulty` = `'beginner' | 'intermediate' | 'expert'`
- `BoardConfig` = `{ rows, cols, mines }`

### `new MinesweeperEngine(options?)`

| 옵션            | 설명                                                |
| --------------- | --------------------------------------------------- |
| `config`        | 난이도 이름 또는 `BoardConfig` (기본 `'beginner'`)  |
| `minePositions` | 지뢰 위치 고정. `config.mines`는 위치 개수로 대체됨 |
| `random`        | 지뢰 배치용 `[0, 1)` 난수 함수 (기본 `Math.random`) |
| `now`           | 경과 시간용 현재 시각 함수, ms (기본 `Date.now`)    |

| 분류 | 메서드                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------- |
| 시작 | `newGame(config?)` — 생략하면 현재 설정으로 새 판                                                  |
| 입력 | `reveal(row, col)`, `chord(row, col)` → 새로 열린 `Position[]`, `toggleFlag(row, col)` → `boolean` |
| 조회 | `getCell()`, `getBoard()`, `getConfig()`, `getExplodedPosition()`                                  |
| 상태 | `getStatus()`, `isOver()`, `getRemainingMines()`, `getRevealedCount()`, `getElapsedTime()`         |

잘못된 설정이나 범위 밖·중복된 `minePositions`는 `Error`를 던집니다. 입력 메서드는 범위 밖·게임 종료 등 동작할 수 없는 경우 빈 배열이나 `false`를 반환합니다.

### 상수·유틸

- `DIFFICULTY_CONFIGS` — beginner 9x9/10, intermediate 16x16/40, expert 16x30/99
- `resolveConfig(config)`, `createEmptyBoard(rows, cols)`, `getNeighbors(pos, rows, cols)`, `pickMinePositions(config, exclude?, random?)`, `layMines(board, positions)`

## 설계 노트

- **첫 클릭 보호**: 지뢰는 첫 `reveal` 때 배치하며, 그 칸과 주변 8칸을 피합니다. 첫 칸은 항상 0이라 연쇄로 열립니다. 남은 칸이 모자라면(지뢰가 아주 많은 판) 첫 칸 주변 제외를 포기합니다.
- **연쇄 열기**: 주변 지뢰가 0인 칸에서 BFS로 퍼지며, 깃발 칸은 건너뜁니다.
- **승패**: 지뢰가 아닌 칸을 모두 열면 승리하고 남은 지뢰에 깃발이 자동으로 꽂힙니다. 지뢰를 열면 패배하고 깃발 없는 지뢰가 모두 `revealed`가 됩니다(잘못 꽂은 깃발은 그대로).
- **타이머**: 첫 칸을 연 시각부터 재고 게임이 끝나면 멈춥니다. 엔진은 tick을 내보내지 않으므로 화면 갱신은 쓰는 쪽에서 `getElapsedTime()`을 주기적으로 읽어야 합니다.
- **정보 노출**: `getBoard()`·`getCell()`은 닫힌 칸의 `isMine`도 돌려줍니다. 화면에는 `state`가 `revealed`인 칸의 정보만 보여줘야 합니다.
