/**
 * 페이지 단위로 데이터를 가져오는 함수
 *
 * 마지막 페이지에서는 `nextState`를 생략하거나 `undefined`·`null`로 반환한다.
 *
 * @template T - 개별 아이템 타입
 * @template S - 다음 페이지를 가리키는 커서/상태 타입
 */
export type PagedFetch<T, S> = (
  state?: S,
) => Promise<{ items: T[]; nextState?: S | null }>

/** {@link iteratePaginated}의 옵션 */
export interface IteratePaginatedOptions {
  /**
   * 순회를 중단하는 신호.
   *
   * 매 `fetcher` 호출 전과 아이템을 내보내기 전에 확인하며, 중단되면
   * `signal.reason`을 던진다. 진행 중인 `fetcher` 호출 자체를 취소하지는 않는다.
   */
  signal?: AbortSignal
}

/**
 * 같은 커서가 연속으로 반환되어 순회를 멈췄을 때 던지는 에러
 *
 * 서버 버그 등으로 `nextState`가 방금 넘긴 커서와 같으면 같은 페이지를 끝없이
 * 요청하게 되므로, {@link iteratePaginated}는 이 에러로 순회를 끝낸다.
 * 비교는 `Object.is`라 매번 새로 만든 객체 커서는 감지하지 못한다.
 */
export class RepeatedCursorError extends Error {
  /** 반복된 커서 값 */
  readonly cursor: unknown

  /** @param cursor - 연속으로 반환된 커서 값 */
  constructor(cursor: unknown) {
    super(`nextState가 직전 커서와 같습니다: ${String(cursor)}`)
    this.name = 'RepeatedCursorError'
    this.cursor = cursor
  }
}

/**
 * 페이지네이션 API를 아이템 단위 async iterable로 평탄화
 *
 * `fetcher`가 반환한 `nextState`를 다음 호출에 넘기며, `nextState`가
 * `undefined` 또는 `null`이 될 때까지 반복한다. 페이지 전체를 메모리에 쌓지 않고
 * 하나씩 흘려보내므로 대용량 목록을 순회할 때 유용하다.
 *
 * @template T - 개별 아이템 타입
 * @template S - 커서/상태 타입
 * @param fetcher - 한 페이지를 가져오는 함수
 * @param initialState - 첫 호출에 넘길 커서 (없으면 `undefined`)
 * @param options - 중단 신호 등 순회 옵션
 * @returns 아이템을 하나씩 내보내는 async generator
 * @throws `nextState`가 직전에 넘긴 커서와 같으면(`Object.is`) {@link RepeatedCursorError}
 * @throws `options.signal`이 중단되면 `signal.reason`
 * @example
 * ```ts
 * import { iteratePaginated } from '@cbcruk/iterate-paginated'
 *
 * for await (const user of iteratePaginated(fetchUsers)) {
 *   console.log(user)
 * }
 * ```
 * @example 중단 신호
 * ```ts
 * import { iteratePaginated } from '@cbcruk/iterate-paginated'
 *
 * const controller = new AbortController()
 *
 * for await (const user of iteratePaginated(fetchUsers, undefined, {
 *   signal: controller.signal,
 * })) {
 *   console.log(user)
 * }
 * ```
 */
export async function* iteratePaginated<T, S>(
  fetcher: PagedFetch<T, S>,
  initialState?: S,
  options: IteratePaginatedOptions = {},
): AsyncGenerator<T> {
  const { signal } = options
  let state = initialState

  while (true) {
    signal?.throwIfAborted()

    const { items, nextState } = await fetcher(state)

    for (const item of items) {
      signal?.throwIfAborted()
      yield item
    }

    if (nextState === undefined || nextState === null) {
      return
    }

    if (Object.is(nextState, state)) {
      throw new RepeatedCursorError(nextState)
    }

    state = nextState
  }
}
