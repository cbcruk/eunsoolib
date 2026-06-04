# @eunsoolib/stacked-pr

GitHub의 [`gh stack`](https://github.github.com/gh-stack/)을 git이나 네트워크 없이 순수 인메모리 자료구조로 모델링한 Stacked PR 구현체

## 개념

Stacked PR은 큰 변경을 작은 PR 여러 개로 쪼개되, 각 PR이 바로 아래 PR을 base로 삼아 쌓아 올리는 워크플로우입니다. 이 패키지는 git/네트워크 연산을 흉내내지 않고, 자료구조 레벨의 불변식만 보장합니다.

```
→ feat/frontend       (base: feat/api-endpoints)  PR #3 [draft]
  │
  feat/api-endpoints  (base: feat/auth-layer)      PR #2 [open]
  │
  feat/auth-layer     (base: main)                 PR #1 [open]
  │
  main  (trunk)
```

## 불변식

- `layers[0].base === trunk` — 맨 아래 레이어는 항상 trunk를 가리킴 (bottom invariant)
- `layers[i].base === layers[i-1].branch` — 각 레이어는 바로 아래 브랜치를 base로 함 (chain invariant)
- `add()`는 커서가 top에 있을 때만 허용됨 (`gh stack add` 규칙)
- `mergeUpTo()`는 항상 bottom-up으로만 병합됨 (`gh-stack` merge 규칙)

## 사용법

```typescript
import { Stack } from '@eunsoolib/stacked-pr'

const stack = Stack.from('main', [
  'feat/auth-layer',
  'feat/api-endpoints',
  'feat/frontend',
])

stack.attachPR('feat/auth-layer', {
  number: 1,
  title: 'Auth layer',
  status: 'open',
})
stack.attachPR('feat/api-endpoints', {
  number: 2,
  title: 'API routes',
  status: 'open',
})
stack.attachPR('feat/frontend', { number: 3, title: 'UI', status: 'draft' })

console.log(stack.render())
```

## API

### 생성

| 메서드                          | 설명                                     |
| ------------------------------- | ---------------------------------------- |
| `new Stack(trunk)`              | trunk 브랜치만 가진 빈 스택 생성         |
| `Stack.from(trunk, branches[])` | 브랜치 배열로 완성된 스택을 한 번에 생성 |

### 조회 (Read)

| 멤버              | 설명                              |
| ----------------- | --------------------------------- |
| `current`         | 현재 체크아웃된 브랜치 (커서)     |
| `size`            | 레이어 개수                       |
| `isEmpty`         | 레이어가 없는지 여부              |
| `view()`          | 모든 레이어 스냅샷 (bottom → top) |
| `indexOf(branch)` | 브랜치의 인덱스 (없으면 `-1`)     |
| `has(branch)`     | 브랜치 존재 여부                  |

### 변경 (Mutate)

| 메서드                 | 설명                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| `add(branch)`          | `gh stack add` — 스택 맨 위에 새 브랜치 추가 (top에 있을 때만 가능) |
| `attachPR(branch, pr)` | 레이어에 PR 연결 (`gh stack submit` 이후)                           |
| `mergeUpTo(branch)`    | 해당 브랜치와 그 아래 모든 레이어를 병합 후 나머지를 trunk로 rebase |

### 이동 (Navigation)

| 메서드             | 설명                                               |
| ------------------ | -------------------------------------------------- |
| `up(n?)`           | `gh stack up` — trunk에서 멀어지는 방향으로 이동   |
| `down(n?)`         | `gh stack down` — trunk에 가까워지는 방향으로 이동 |
| `top()`            | `gh stack top` — 맨 위 브랜치로 점프               |
| `bottom()`         | `gh stack bottom` — 맨 아래 브랜치로 점프          |
| `checkout(branch)` | 임의의 브랜치(또는 trunk)로 체크아웃               |

### 렌더링

| 메서드     | 설명                                    |
| ---------- | --------------------------------------- |
| `render()` | gh-stack 문서 스타일의 ASCII 다이어그램 |

## Result 타입

모든 변경/이동 메서드는 예외를 던지지 않고 태그된 `Result`를 반환합니다.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

const r = stack.add('feat/new-layer')
if (r.ok) {
  console.log(`added ${r.value.branch}`)
} else {
  console.error(r.error.type)
}
```

### 에러 종류

| `type`            | 발생 조건                                           |
| ----------------- | --------------------------------------------------- |
| `NotOnTop`        | top이 아닌 위치에서 `add()` 호출                    |
| `BranchExists`    | 이미 존재하는 브랜치를 `add()`                      |
| `BranchNotFound`  | 존재하지 않는 브랜치를 참조                         |
| `EmptyStack`      | 빈 스택에서 이동 시도                               |
| `BoundaryReached` | 더 이상 위/아래로 이동할 수 없음 (`direction` 포함) |

## 병합 동작

`mergeUpTo(branch)`는 gh-stack의 direct-merge 의미를 따릅니다 — "해당 PR과 그 아래의 병합되지 않은 모든 PR을 병합".

```typescript
// #1을 병합하면 #1만 merged 상태가 되고,
// 남은 #2, #3는 trunk(main) 위로 rebase됩니다.
const r = stack.mergeUpTo('feat/auth-layer')
if (r.ok) {
  console.log(r.value.merged.map((l) => l.branch)) // ['feat/auth-layer']
  console.log(r.value.remaining.map((l) => l.branch)) // ['feat/api-endpoints', 'feat/frontend']
}
```

병합 후 커서가 병합된 브랜치 위에 있었다면, 새로운 맨 아래 브랜치(또는 스택이 비면 trunk)로 자동 이동합니다.

## 설계 포인트

**왜 배열인가** — `up n` / `down n` 같은 점프 명령이 인덱스 산술 한 번으로 끝나야 자연스럽습니다. 링크드 리스트로 가면 cursor 이동마다 O(n) traversal에다 base 포인터 재계산도 따로 해야 해서 손해입니다. 한 스택의 layer 수가 보통 5~10개 수준이라 array splice 비용도 무시 가능합니다.

**`trunk`을 가상 인덱스 -1로 취급** — 문서에 "If you're on the trunk branch, `up` moves to the first stack branch"라고 명시돼 있는데, cursor가 trunk일 때 `currentIdx = -1`로 두면 `up(1)` → `layers[0]`이 자연스럽게 떨어집니다. 따로 분기할 필요가 없습니다.

**`mergeUpTo`의 rebase 의미** — gh-stack에서 "After partial merges, the remaining branches are automatically rebased so the next PR targets `main`"이라고 했는데, 자료구조 레벨에선 그냥 `layers[0].base = trunk`로 갱신하면 끝입니다. 실제 git rebase의 commit replay는 모델에 없고, base 포인터 invariant만 유지합니다.

**Result 패턴** — tagged discriminated union을 그대로 적용했습니다. `throw` 없이 모든 실패 경로가 타입에 드러나서, `result.ok`로 좁히면 `result.error.type`에 대해 exhaustive switch가 가능합니다.

**검증하지 않은 범위** — `gh stack rebase`의 cascading rebase(trunk가 움직였을 때 stack 전체 onto 변경), `gh stack unstack`(local/remote 분리), squash merge의 `--onto` 모드는 자료구조보다 git 연산 시뮬레이션 영역이라 일부러 제외했습니다.

## 데모

`demo()` 함수가 gh-stack 개요 페이지의 예제 흐름을 그대로 보여줍니다.

```typescript
import { demo } from '@eunsoolib/stacked-pr'

demo()
```

실행은 `index.ts` 마지막 줄의 `demo()` 주석을 풀고 `npx tsx index.ts` 또는 `bun index.ts`로 가능합니다.
