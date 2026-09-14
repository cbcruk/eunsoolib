# @cbcruk/iterate-paginated

페이지네이션 API를 아이템 단위 async iterable로 평탄화합니다.

커서를 넘기며 페이지를 반복 요청하는 루프를 `for await`로 감춥니다. 페이지 결과를 한곳에 모으지
않고 아이템을 하나씩 흘려보내므로, 중간에 `break`하면 이후 페이지는 요청하지 않습니다.

## 설치

```bash
pnpm add @cbcruk/iterate-paginated
```

## 사용법

```ts
import { iteratePaginated, type PagedFetch } from '@cbcruk/iterate-paginated'

type User = { id: string; name: string }

const fetchUsers: PagedFetch<User, string> = async (cursor) => {
  const res = await fetch(`/api/users?cursor=${cursor ?? ''}`)
  const { data, nextCursor } = await res.json()

  // 마지막 페이지면 nextCursor가 null/undefined → 순회 종료
  return { items: data, nextState: nextCursor }
}

for await (const user of iteratePaginated(fetchUsers)) {
  console.log(user.name)
}
```

첫 호출에 넘길 커서가 있으면 두 번째 인자로 줍니다.

```ts
for await (const user of iteratePaginated(fetchUsers, 'cursor-from-last-run')) {
  // ...
}
```

## API

### `iteratePaginated(fetcher, initialState?, options?)`

`AsyncGenerator<T>`를 반환합니다.

1. `fetcher(initialState)`를 호출합니다.
2. 받은 `items`를 순서대로 `yield`합니다.
3. `nextState`가 `undefined`나 `null`이면 끝냅니다.
4. `nextState`가 방금 넘긴 커서와 같으면(`Object.is`) `RepeatedCursorError`를 던집니다.
5. 그 밖에는 `nextState`로 다시 `fetcher`를 호출합니다.

`fetcher`는 최소 한 번 호출됩니다.

| 인자           | 타입                      | 설명                                   |
| -------------- | ------------------------- | -------------------------------------- |
| `fetcher`      | `PagedFetch<T, S>`        | 한 페이지를 가져오는 함수              |
| `initialState` | `S`                       | 첫 호출에 넘길 커서 (기본 `undefined`) |
| `options`      | `IteratePaginatedOptions` | 순회 옵션                              |

#### `IteratePaginatedOptions`

| 옵션     | 타입          | 설명                                                                                            |
| -------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `signal` | `AbortSignal` | 중단 신호. `fetcher` 호출 전과 아이템을 내보내기 전에 확인하고, 중단되면 `signal.reason`을 던짐 |

```ts
const controller = new AbortController()

for await (const user of iteratePaginated(fetchUsers, undefined, {
  signal: controller.signal,
})) {
  // controller.abort()를 호출하면 다음 아이템/페이지 전에 멈춤
}
```

`signal`은 진행 중인 `fetcher` 호출을 취소하지 않습니다. 요청까지 끊으려면 같은 `signal`을
`fetcher` 안의 `fetch`에도 넘기세요.

### `RepeatedCursorError`

`nextState`가 직전 커서와 같아 순회를 멈췄을 때 던지는 에러입니다. 반복된 값은 `cursor`
속성에 담깁니다.

### `PagedFetch<T, S>`

```ts
type PagedFetch<T, S> = (
  state?: S,
) => Promise<{ items: T[]; nextState?: S | null }>
```

## 주의

- 종료 조건은 `nextState`가 `undefined` 또는 `null`인 경우입니다. 빈 문자열이나 `0` 같은 값은
  유효한 커서로 보고 계속 요청하므로, API가 이런 값으로 마지막 페이지를 표시하면 `fetcher`에서
  `null`로 바꿔 반환하세요.
- 반복 커서 감지는 직전 커서와의 `Object.is` 비교뿐입니다. 매번 새 객체를 커서로 쓰거나 커서가
  `A → B → A`처럼 순환하면 감지하지 못합니다.
