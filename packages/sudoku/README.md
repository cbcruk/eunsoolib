# @eunsoolib/sudoku

스도쿠 퍼즐 생성·풀이·게임 엔진입니다.

9x9 스도쿠를 세 층으로 나눠 모델링한 설계 실험입니다. 보드 검증 유틸(`sudoku.utils`) 위에 백트래킹 풀이기(`solver`)와 퍼즐 생성기(`generator`)를 올리고, 그 위에 메모·실행취소·힌트를 갖춘 게임 엔진 `SudokuEngine`을 둡니다. 모든 함수는 순수 계산이라 UI·런타임 제약이 없습니다.

## 설치

```bash
pnpm add @eunsoolib/sudoku
```

## 사용법

### 게임 엔진

```ts
import { SudokuEngine, generatePuzzle } from '@eunsoolib/sudoku'

const engine = new SudokuEngine(generatePuzzle('easy')) // 인자 없으면 medium 생성

engine.toggleMemo(0, 2, 4)
engine.setValue(0, 2, 4) // 고정 셀이면 false
engine.getConflicts(0, 2) // Position[]
engine.undo()
engine.redo()
engine.applyHint()

engine.isCompleted() // 모든 칸이 채워졌는지
engine.isSolved() // 채워졌고 규칙 위반이 없는지
```

### 함수만 사용

```ts
import {
  formatBoard,
  hasUniqueSolution,
  parseBoard,
  solve,
} from '@eunsoolib/sudoku'

const board = parseBoard(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
)

hasUniqueSolution(board) // true
const solved = solve(board) // Board | null
console.log(formatBoard(solved!))
```

## API

### 타입

- `CellValue` = `0 | 1 | … | 9` (`0`은 빈 칸), `Board` = `CellValue[][]`, `Position` = `{ row, col }`
- `Cell` = `{ value, isFixed, memos: Set<number> }`, `CellGrid` = `Cell[][]`
- `Difficulty` = `'easy' | 'medium' | 'hard' | 'expert'`
- `GeneratedPuzzle` = `{ puzzle, solution, difficulty, emptyCells }`
- `GameAction`, `GameState` (엔진 내부 기록용/미사용 타입)

### `new SudokuEngine(puzzle?)`

| 분류      | 메서드                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------- |
| 시작      | `newGame(difficulty = 'medium')`, `loadPuzzle(board)`, `reset()`                                         |
| 입력      | `setValue(row, col, value)`, `clearValue(row, col)`, `toggleMemo(row, col, num)`, `clearMemos(row, col)` |
| 기록      | `undo()`, `redo()`, `canUndo()`, `canRedo()`                                                             |
| 힌트·풀이 | `getHint()`, `applyHint()`, `autoSolve()`                                                                |
| 조회      | `getCell()`, `getBoard()`, `getGrid()`, `getSolution()`, `getDifficulty()`                               |
| 판정      | `isCompleted()`, `isSolved()`, `isValid()`, `checkCell(row, col)`, `getConflicts(row, col)`              |
| 진행      | `getEmptyCellCount()`, `getProgress()`(0~100 정수)                                                       |

입력 메서드는 성공 여부를 `boolean`으로 반환합니다. 조회 메서드는 복사본을 돌려주므로 반환값을 수정해도 엔진 상태는 바뀌지 않습니다.

### 생성기

| 함수                                         | 설명                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| `generatePuzzle(difficulty = 'medium')`      | 점대칭으로 칸을 지우며 매번 유일해를 확인                      |
| `generateQuickPuzzle(difficulty = 'medium')` | 40칸을 넘게 비운 뒤부터만 유일해를 확인하는 빠른 버전          |
| `parseBoard(str)`                            | 숫자·`.`만 추려 81자 보드로 파싱 (`.`은 빈 칸). 아니면 `Error` |
| `boardToString(board)`                       | 81자 문자열                                                    |
| `formatBoard(board)`                         | 3x3 구분선이 들어간 표시용 문자열                              |

`DIFFICULTY_CELLS_TO_REMOVE`: 비울 칸 수 범위 — easy 30~35, medium 36~45, hard 46~52, expert 53~58.

### 풀이기

`solve(board)`, `countSolutions(board, maxCount = 2)`, `hasUniqueSolution(board)`, `getHint(board)`, `generateSolvedBoard()`

### 유틸

`createEmptyBoard`, `cloneBoard`, `isValidInRow`, `isValidInCol`, `isValidInBox`, `isValidPlacement`, `getPossibleNumbers`, `findEmptyCell`, `isBoardFilled`, `isBoardValid`, `isBoardSolved`, `getConflictingCells`, `shuffle`

## 설계 노트

- **고정 셀**: 초기 퍼즐에서 `0`이 아닌 칸은 `isFixed`가 되어 입력·메모·`reset()`·`autoSolve()`의 대상에서 빠집니다.
- **메모 규칙**: 값이 들어 있는 칸에는 메모를 토글할 수 없고, 값을 입력하면 그 칸의 메모가 지워집니다.
- **실행취소**: 입력 메서드마다 이전 값·메모를 담은 `GameAction`을 undo 스택에 쌓고, 새 입력은 redo 스택을 비웁니다. `newGame` · `loadPuzzle` · `reset` · `autoSolve`는 기록을 모두 지웁니다.
- **힌트**: 후보가 하나뿐인 칸(naked single)을 먼저 찾고, 없으면 **현재 보드**를 풀어 첫 빈 칸의 값을 줍니다. 저장된 정답과 비교하지 않으므로, 잘못 입력한 값 때문에 풀 수 없으면 `null`이 됩니다.
- **난이도**: 비운 칸 수로만 정하며, 풀이 기법 난이도는 따지지 않습니다. 유일해가 깨지는 칸은 되돌리므로 실제 `emptyCells`가 범위에 못 미칠 수 있습니다.
- **`loadPuzzle`**: 난이도는 항상 `'medium'`으로 두고, 풀 수 없는 보드면 퍼즐 자체를 정답으로 저장합니다.
