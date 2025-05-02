export type PagedFetch<T, S> = (
  state?: S
) => Promise<{ items: T[]; nextState?: S }>

export async function* iteratePaginated<T, S>(
  fetcher: PagedFetch<T, S>,
  initialState?: S
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
