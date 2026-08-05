/**
 * 페이지 단위로 데이터를 가져오는 함수
 *
 * @template T - 개별 아이템 타입
 * @template S - 다음 페이지를 가리키는 커서/상태 타입
 */
export type PagedFetch<T, S> = (
  state?: S,
) => Promise<{ items: T[]; nextState?: S }>

/**
 * 페이지네이션 API를 아이템 단위 async iterable로 평탄화
 *
 * `fetcher`가 반환한 `nextState`를 다음 호출에 넘기며, `nextState`가
 * `undefined`가 될 때까지 반복한다. 페이지 전체를 메모리에 쌓지 않고
 * 하나씩 흘려보내므로 대용량 목록을 순회할 때 유용하다.
 *
 * @template T - 개별 아이템 타입
 * @template S - 커서/상태 타입
 * @param fetcher - 한 페이지를 가져오는 함수
 * @param initialState - 첫 호출에 넘길 커서 (없으면 `undefined`)
 * @returns 아이템을 하나씩 내보내는 async generator
 * @example
 * ```ts
 * for await (const user of iteratePaginated(fetchUsers)) {
 *   console.log(user)
 * }
 * ```
 */
export async function* iteratePaginated<T, S>(
  fetcher: PagedFetch<T, S>,
  initialState?: S,
): AsyncGenerator<T> {
  let state = initialState

  do {
    const { items, nextState } = await fetcher(state)

    for (const item of items) {
      yield item
    }

    state = nextState
  } while (state !== undefined)
}
