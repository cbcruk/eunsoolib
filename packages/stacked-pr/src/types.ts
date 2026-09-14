/** PR의 상태. */
export type PRStatus = 'draft' | 'open' | 'merged' | 'closed'

/** layer에 연결된 PR. */
export interface PullRequest {
  /** PR 번호. */
  readonly number: number
  /** PR 제목. */
  readonly title: string
  /** PR 상태. `Stack.mergeUpTo`로 병합되면 `'merged'`가 된다. */
  readonly status: PRStatus
}

/** 스택을 이루는 브랜치 하나. */
export interface Layer {
  /** 브랜치 이름. */
  readonly branch: string
  /** trunk(layers[0]의 경우) 또는 바로 아래 브랜치. */
  readonly base: string
  /** `Stack.attachPR`로 연결한 PR. 없으면 `undefined`. */
  readonly pr?: PullRequest
}

/** 태그된 Result — 예외를 던지지 않고 성공/실패를 명시적으로 표현. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** `Stack`의 연산이 실패했을 때 `type`으로 구분되는 에러. */
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
