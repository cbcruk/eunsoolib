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
