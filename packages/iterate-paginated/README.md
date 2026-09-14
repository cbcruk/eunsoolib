# @eunsoolib/iterate-paginated

페이지네이션 API를 아이템 단위 async iterable로 평탄화합니다.

커서를 넘기며 페이지를 반복 요청하는 루프를 `for await`로 감춥니다. 페이지 결과를 한곳에 모으지
않고 아이템을 하나씩 흘려보내므로, 중간에 `break`하면 이후 페이지는 요청하지 않습니다.

## 설치

```bash
pnpm add @eunsoolib/iterate-paginated
```

## 사용법

```ts
import { iteratePaginated, type PagedFetch } from '@eunsoolib/iterate-paginated'

type User = { id: string; name: string }

const fetchUsers: PagedFetch<User, string> = async (cursor) => {
  const res = await fetch(`/api/users?cursor=${cursor ?? ''}`)
  const { data, nextCursor } = await res.json()

  // 마지막 페이지면 nextState를 undefined로
  return { items: data, nextState: nextCursor ?? undefined }
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

### `iteratePaginated(fetcher, initialState?)`

`AsyncGenerator<T>`를 반환합니다.

1. `fetcher(initialState)`를 호출합니다.
2. 받은 `items`를 순서대로 `yield`합니다.
3. `nextState`가 `undefined`가 아니면 그 값으로 다시 `fetcher`를 호출하고, `undefined`면 끝냅니다.

`fetcher`는 최소 한 번 호출됩니다.

| 인자           | 타입               | 설명                                   |
| -------------- | ------------------ | -------------------------------------- |
| `fetcher`      | `PagedFetch<T, S>` | 한 페이지를 가져오는 함수              |
| `initialState` | `S`                | 첫 호출에 넘길 커서 (기본 `undefined`) |

### `PagedFetch<T, S>`

```ts
type PagedFetch<T, S> = (state?: S) => Promise<{ items: T[]; nextState?: S }>
```

## 주의

종료 조건은 `nextState === undefined`뿐입니다. API가 마지막 페이지에서 `null`이나 빈 문자열을
커서로 주면 루프가 끝나지 않으므로 `fetcher`에서 `undefined`로 바꿔 반환하세요.
