/**
 * Query 상태를 결정하는 두 축 중 데이터 축.
 *
 * `pending`은 "아직 data가 없다"는 뜻이지 "요청 중"이라는 뜻이 아니다.
 * 요청 여부는 {@linkcode FetchStatus}가 따로 들고 있다.
 */
export type QueryStatus = 'pending' | 'error' | 'success'

/**
 * Query 상태를 결정하는 두 축 중 네트워크 축.
 *
 * `paused`는 오프라인 등으로 요청이 보류된 상태로, `pending`도 `error`도 아닌
 * 제3의 축이다. 이 값이 있기 때문에 상태를 4상태 유니온으로 접을 수 없다.
 */
export type FetchStatus = 'fetching' | 'paused' | 'idle'

/**
 * `useQuery` / `useSuspenseQuery` 결과의 구조적 형태.
 *
 * `@tanstack/react-query`를 import하지 않으므로 런타임 의존성이 생기지 않고,
 * 테스트에서 plain object로 상태를 주입할 수 있다. v5의 개명(`isLoading` →
 * `isPending`)이 다시 오더라도 고칠 곳은 이 타입과 {@linkcode toQueryState}
 * 한 함수뿐이다.
 */
export type QueryLike<T> = {
  /** 데이터 축. */
  status: QueryStatus
  /** 성공한 적이 있으면 값이 남는다. 실패해도 이전 값은 유지된다. */
  data: T | undefined
  /** `status`가 `error`일 때만 의미가 있다. */
  error: unknown
  /** 네트워크 축. 생략하면 `idle`로 본다. */
  fetchStatus?: FetchStatus
  /** `staleTime`이 지나 재검증 대상이 되었는지. */
  isStale?: boolean
  /** 값은 있지만 그 값 자체가 대역(`placeholderData`)인지. */
  isPlaceholderData?: boolean
  /** 연속 실패 횟수. 재시도 UI의 문구를 바꾸는 데 쓴다. */
  failureCount?: number
  /** 재요청 트리거. 없으면 재시도 슬롯은 no-op을 받는다. */
  refetch?: () => unknown
}

/**
 * {@linkcode QueryState}의 판별자.
 *
 * 앞의 셋(`idle` / `loading` / `failed`)은 data가 없는 교체 층이고,
 * 뒤의 둘(`ready` / `degraded`)은 data가 있는 중첩 층이다.
 */
export type QueryPhase = 'idle' | 'loading' | 'failed' | 'ready' | 'degraded'

/**
 * Query 상태 매트릭스의 분류 결과.
 *
 * Query의 상태는 4상태 sum type이 아니라 {@linkcode QueryStatus}와
 * {@linkcode FetchStatus} 두 축의 product다.
 *
 * | | `idle` | `fetching` | `paused` |
 * | --- | --- | --- | --- |
 * | **`pending`** | `idle` | `loading` | `loading` +paused |
 * | **`success`** | `ready` | `ready` +refreshing | `ready` +paused |
 * | **`error`** | `failed` / `degraded` | +retrying | +paused |
 *
 * 이 곱을 평평한 유니온으로 펼치면 가장 중요한 사실이 사라진다 — **data의 존재
 * 여부가 나머지 전부의 성격을 바꾼다.** 그래서 `phase`(교체 층)와
 * modifier(중첩 층)로 나눈다. `phase`는 "무엇이 무엇을 대체하는가"를,
 * modifier는 "무엇이 콘텐츠를 장식하는가"를 결정한다.
 */
export type QueryState<T> =
  /** 시도 이전. `enabled: false` / `skipToken`이 여기로 온다. */
  | { readonly phase: 'idle' }
  /** 첫 data를 기다리는 중. 보여줄 콘텐츠가 아직 없다. */
  | {
      readonly phase: 'loading'
      readonly paused: boolean
      readonly failureCount: number
    }
  /** 실패했고 보여줄 data도 없다. {@linkcode QueryState} `degraded`와 같은 에러의 다른 칸. */
  | {
      readonly phase: 'failed'
      readonly error: unknown
      readonly retrying: boolean
      readonly paused: boolean
      readonly failureCount: number
    }
  /** data가 있다. 나머지 필드는 콘텐츠를 장식하는 modifier다. */
  | {
      readonly phase: 'ready'
      readonly data: T
      readonly refreshing: boolean
      readonly paused: boolean
      readonly stale: boolean
      /** `isPlaceholderData` — 값이 있지만 그 값 자체가 대역이다. */
      readonly provisional: boolean
    }
  /** 실패했지만 이전 data가 남아 있다. 흰 화면이 아니라 콘텐츠 + 배너가 맞는 칸. */
  | {
      readonly phase: 'degraded'
      readonly data: T
      readonly error: unknown
      readonly retrying: boolean
      readonly paused: boolean
    }

/**
 * {@linkcode QueryState}에서 특정 phase의 멤버만 뽑는다.
 *
 * 슬롯 콜백이 받는 상태의 타입을 적을 때 쓴다.
 *
 * @example 실패 상태만 받는 함수
 * ```ts
 * import type { QueryStateOf } from '@cbcruk/query-view'
 *
 * function retryLabel(state: QueryStateOf<unknown, 'failed'>): string {
 *   return state.retrying ? 'Retrying…' : `Retry (${state.failureCount})`
 * }
 * ```
 */
export type QueryStateOf<T, P extends QueryPhase> = Extract<
  QueryState<T>,
  { phase: P }
>
