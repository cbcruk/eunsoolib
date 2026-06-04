export type PRStatus = 'draft' | 'open' | 'merged' | 'closed'

export interface PullRequest {
  readonly number: number
  readonly title: string
  readonly status: PRStatus
}

export interface Layer {
  readonly branch: string
  /** trunk(layers[0]의 경우) 또는 바로 아래 브랜치. */
  readonly base: string
  readonly pr?: PullRequest
}

/** 태그된 Result — 예외를 던지지 않고 성공/실패를 명시적으로 표현. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export type StackError =
  /** 커서가 top 브랜치에 있지 않은 상태에서 `add()`를 호출함. */
  | {
      readonly type: 'NotOnTop'
      readonly current: string
      readonly top: string
    }
  /** 이미 스택에 존재하는 브랜치 이름으로 `add()`를 호출함. */
  | { readonly type: 'BranchExists'; readonly branch: string }
  /** 스택에 없는 브랜치를 참조함. */
  | { readonly type: 'BranchNotFound'; readonly branch: string }
  /** layer가 없는 스택에서 이동/병합 연산을 시도함. */
  | { readonly type: 'EmptyStack' }
  /** 커서가 이미 끝에 있어 `up`/`down` 이동이 불가능함. */
  | { readonly type: 'BoundaryReached'; readonly direction: 'up' | 'down' }

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export class Stack {
  /** Trunk 브랜치 — 예: `main`. */
  readonly trunk: string

  /** 아래→위 순서. layers[0]이 trunk에 가장 가깝고, 마지막 원소가 top. */
  private readonly layers: Layer[] = []

  /** 네비게이션 커서 — 현재 "체크아웃된" 브랜치 (trunk 또는 layer). */
  private cursor: string

  constructor(trunk: string) {
    this.trunk = trunk
    this.cursor = trunk
  }

  /** 완성된 스택을 한 번에 생성하는 편의 메서드 (`gh stack init a b c`). */
  static from(trunk: string, branches: readonly string[]): Stack {
    const s = new Stack(trunk)
    for (const b of branches) {
      const r = s.add(b)
      if (!r.ok)
        throw new Error(`Stack.from: failed to add "${b}" (${r.error.type})`)
    }
    return s
  }

  /** 커서가 현재 가리키는 브랜치 (trunk 또는 layer). */
  get current(): string {
    return this.cursor
  }

  /** trunk를 제외한 layer 개수. */
  get size(): number {
    return this.layers.length
  }

  /** layer가 하나도 없을 때(= trunk만 존재) true. */
  get isEmpty(): boolean {
    return this.layers.length === 0
  }

  /** 모든 layer의 스냅샷, 아래 → 위 순서. */
  view(): readonly Layer[] {
    return this.layers
  }

  /** `branch`의 0-기반 layer 인덱스. layer가 아니면 `-1`. */
  indexOf(branch: string): number {
    return this.layers.findIndex((l) => l.branch === branch)
  }

  /** `branch`가 layer로 존재하는지 여부 (trunk는 layer가 아님). */
  has(branch: string): boolean {
    return this.indexOf(branch) !== -1
  }

  /** 최상단 브랜치. 스택이 비면 trunk로 폴백. */
  private topBranch(): string {
    return this.isEmpty
      ? this.trunk
      : this.layers[this.layers.length - 1].branch
  }

  /** 맨 아래 layer의 브랜치. 스택이 비면 trunk로 폴백. */
  private bottomBranch(): string {
    return this.isEmpty ? this.trunk : this.layers[0].branch
  }

  /** `gh stack add` — 스택 맨 위에 새 브랜치를 추가. */
  add(branch: string): Result<Layer, StackError> {
    const top = this.topBranch()
    if (this.cursor !== top) {
      return err({ type: 'NotOnTop', current: this.cursor, top })
    }
    if (this.has(branch)) {
      return err({ type: 'BranchExists', branch })
    }
    const layer: Layer = { branch, base: top }
    this.layers.push(layer)
    this.cursor = branch
    return ok(layer)
  }

  /** layer에 PR을 연결 (`gh stack submit` 이후 호출). */
  attachPR(branch: string, pr: PullRequest): Result<Layer, StackError> {
    const i = this.indexOf(branch)
    if (i === -1) return err({ type: 'BranchNotFound', branch })
    const updated: Layer = { ...this.layers[i], pr }
    this.layers[i] = updated
    return ok(updated)
  }

  /**
   * 해당 브랜치와 그 아래 모든 layer를 병합 (gh-stack 문서의 direct-merge 의미:
   * "해당 PR과 그 아래의 병합되지 않은 모든 PR을 병합").
   *
   * 병합 후 남은 layer는 rebase되어 새 layers[0].base가 trunk가 된다. 커서도
   * 따라간다: 병합된 브랜치 위에 있었다면 새 맨 아래로(스택이 비면 trunk로) 내려간다.
   */
  mergeUpTo(
    branch: string,
  ): Result<{ merged: Layer[]; remaining: readonly Layer[] }, StackError> {
    const i = this.indexOf(branch)
    if (i === -1) return err({ type: 'BranchNotFound', branch })

    const merged = this.layers.splice(0, i + 1).map((l) => ({
      ...l,
      pr: l.pr ? { ...l.pr, status: 'merged' as const } : undefined,
    }))

    // Rebase 불변식: 새 맨 아래 layer(있다면)는 trunk를 가리킨다.
    if (this.layers.length > 0) {
      this.layers[0] = { ...this.layers[0], base: this.trunk }
    }

    // 커서 후속 처리.
    if (merged.some((l) => l.branch === this.cursor)) {
      this.cursor = this.isEmpty ? this.trunk : this.bottomBranch()
    }

    return ok({ merged, remaining: this.layers })
  }

  /** `gh stack up` — trunk에서 멀어지는 방향으로 `n`칸 이동. top에서 멈춤. */
  up(n: number = 1): Result<string, StackError> {
    if (this.isEmpty) return err({ type: 'EmptyStack' })
    // trunk에서 "up 1" → layers[0]. 따라서 trunk를 가상 인덱스 -1로 취급.
    const currentIdx =
      this.cursor === this.trunk ? -1 : this.indexOf(this.cursor)
    const targetIdx = Math.min(currentIdx + n, this.layers.length - 1)
    if (targetIdx === currentIdx)
      return err({ type: 'BoundaryReached', direction: 'up' })
    this.cursor = this.layers[targetIdx].branch
    return ok(this.cursor)
  }

  /** `gh stack down` — trunk에 가까워지는 방향으로 `n`칸 이동. bottom에서 멈춤. */
  down(n: number = 1): Result<string, StackError> {
    if (this.isEmpty) return err({ type: 'EmptyStack' })
    if (this.cursor === this.trunk)
      return err({ type: 'BoundaryReached', direction: 'down' })
    const currentIdx = this.indexOf(this.cursor)
    const targetIdx = Math.max(currentIdx - n, 0)
    if (targetIdx === currentIdx)
      return err({ type: 'BoundaryReached', direction: 'down' })
    this.cursor = this.layers[targetIdx].branch
    return ok(this.cursor)
  }

  /** `gh stack top` — trunk에서 가장 먼 브랜치로 점프. */
  top(): Result<string, StackError> {
    if (this.isEmpty) return err({ type: 'EmptyStack' })
    this.cursor = this.topBranch()
    return ok(this.cursor)
  }

  /** `gh stack bottom` — trunk에 가장 가까운 브랜치로 점프. */
  bottom(): Result<string, StackError> {
    if (this.isEmpty) return err({ type: 'EmptyStack' })
    this.cursor = this.bottomBranch()
    return ok(this.cursor)
  }

  /** 임의의 브랜치(trunk 또는 layer)로 체크아웃. */
  checkout(branch: string): Result<string, StackError> {
    if (branch === this.trunk) {
      this.cursor = this.trunk
      return ok(this.cursor)
    }
    if (!this.has(branch)) return err({ type: 'BranchNotFound', branch })
    this.cursor = branch
    return ok(this.cursor)
  }

  /** gh-stack 문서의 다이어그램과 유사한 ASCII 렌더링. */
  render(): string {
    const lines: string[] = []
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i]
      const here = l.branch === this.cursor ? '→' : ' '
      const pr = l.pr ? `  PR #${l.pr.number} [${l.pr.status}]` : '  (no PR)'
      lines.push(`${here} ${l.branch}  (base: ${l.base})${pr}`)
      lines.push('  │')
    }
    const trunkHere = this.cursor === this.trunk ? '→' : ' '
    lines.push(`${trunkHere} ${this.trunk}  (trunk)`)
    return lines.join('\n')
  }
}

/** gh-stack 개요 페이지의 예제를 그대로 재현. */
export function demo(): void {
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

  console.log('── initial ──')
  console.log(stack.render())

  // gh stack bottom; gh stack up
  stack.bottom()
  stack.up()
  console.log('\n── after `bottom` then `up` ──')
  console.log(`cursor = ${stack.current}`)

  // 맨 아래 PR 병합. #1 direct merge → #1만 병합되고 #2는 main 위로 rebase.
  const r = stack.mergeUpTo('feat/auth-layer')
  if (r.ok) {
    console.log('\n── after merging feat/auth-layer ──')
    console.log(`merged: ${r.value.merged.map((l) => l.branch).join(', ')}`)
    console.log(stack.render())
  }
}
