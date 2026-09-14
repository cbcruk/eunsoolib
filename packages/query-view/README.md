# @cbcruk/query-view

TanStack Query의 상태 매트릭스를 손실 없이 뷰 슬롯으로 투영하는 레이어

## 설치

```bash
pnpm add @cbcruk/query-view
```

`react`가 peer dependency다. `@tanstack/react-query`는 import하지 않는다 — 아래 [비용](#비용) 참조.

## 상태는 합이 아니라 곱이다

Query의 상태는 4상태 sum type이 아니라 두 축의 product다.

|                           | `fetchStatus: idle`   | `fetching`          | `paused`          |
| ------------------------- | --------------------- | ------------------- | ----------------- |
| **`pending`** (data 없음) | `idle`                | `loading`           | `loading` +paused |
| **`success`**             | `ready`               | `ready` +refreshing | `ready` +paused   |
| **`error`**               | `failed` / `degraded` | +retrying           | +paused           |

`src/query-state.test.ts`가 이 10칸을 전부 검증한다.

## 교체(replace)와 중첩(overlay)

이 라이브러리의 유일한 주장이다.

> **첫 data가 도착하기 전에는 상태가 서로를 교체하고, 도착한 후에는 상태가 콘텐츠를 장식한다.**

`switch`는 본질적으로 "N중 택1"이라 후자를 표현할 수 없다. 그래서 `QueryState`가 `phase`(교체)와 modifier(중첩)로 갈리고, 슬롯도 두 종류가 된다.

| 층           | 슬롯          | 시그니처                               |
| ------------ | ------------- | -------------------------------------- |
| 교체         | `idle`        | `ReactNode`                            |
| 교체         | `placeholder` | `(elapsed, state) => ReactNode`        |
| 교체         | `fallback`    | `(error, retry, state) => ReactNode`   |
| **중첩**     | `provisional` | `(content) => ReactNode`               |
| **중첩**     | `refreshing`  | `(content) => ReactNode`               |
| **중첩**     | `paused`      | `(content) => ReactNode`               |
| **중첩**     | `degraded`    | `(error, retry, content) => ReactNode` |
| 성공 경로 위 | `empty`       | `ReactNode \| ((data) => ReactNode)`   |

중첩 슬롯이 `(content) => ReactNode` 데코레이터인 게 핵심이다. 감싸는 순서는 교체 층의 포함관계를 그대로 따른다.

```
degraded ⊃ paused ⊃ refreshing ⊃ provisional ⊃ content
```

`fallback`과 `degraded`가 **같은 에러에 대한 다른 슬롯**이라는 점이 밀도의 핵심이다. 갈림길 판정은 `data !== undefined` 하나로 끝난다. 검색 결과가 이미 떠 있는데 새로고침이 실패했다면 흰 화면 + 에러 패널이 아니라 기존 내용 + 배너가 맞고, 그 구분을 타입이 강제한다.

## 사용법

### 두 경로

#### `useQuery` → `QueryView`

매트릭스 전체가 컴포넌트 안에 있다. 교체 + 중첩 슬롯을 다 받는다.

```tsx
import { QueryView } from '@cbcruk/query-view'

function PostsPage({ keyword }: { keyword: string }) {
  const query = useQuery({ queryKey: ['posts', keyword], queryFn: fetchPosts })

  return (
    <QueryView
      query={query}
      idle={<p>검색어를 입력하세요</p>}
      placeholder={(elapsed) =>
        elapsed > 5000 ? <p>응답이 늦어지고 있습니다</p> : <PostSkeleton />
      }
      fallback={(error, retry, state) => (
        <ErrorPanel error={error} onRetry={retry} disabled={state.retrying} />
      )}
      refreshing={(content) => <div aria-busy>{content}</div>}
      paused={(content) => (
        <>
          <Banner tone="info">오프라인 — 저장된 내용입니다</Banner>
          {content}
        </>
      )}
      degraded={(error, retry, content) => (
        <>
          <Banner tone="warn" onRetry={retry} />
          {content}
        </>
      )}
      provisional={(content) => <div style={{ opacity: 0.5 }}>{content}</div>}
      empty={<EmptyState keyword={keyword} />}
    >
      {(posts) => <PostList posts={posts} />}
    </QueryView>
  )
}
```

`children`이 받는 `posts`는 항상 확정된 값이라 `?? []`가 필요 없다.

#### `useSuspenseQuery` → `AsyncBoundary` + `SuspenseQueryView`

`useSuspenseQuery`는 `pending`도 `error`도 반환하지 않는다. 둘 다 경계로 올라간다. 그래서:

- **교체 층이 통째로 `AsyncBoundary`로 이동**
- `SuspenseQueryView`에는 중첩 슬롯 + `empty`만 남음 (`Omit`으로 타입에서 제거)

경계와 뷰가 경쟁 관계가 아니라 **층으로 분리**된다.

```tsx
import { AsyncBoundary, Delayed, SuspenseQueryView } from '@cbcruk/query-view'

function PostsRoute({ keyword }: { keyword: string }) {
  return (
    <AsyncBoundary
      placeholder={
        <Delayed>
          <PostSkeleton />
        </Delayed>
      }
      fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
      resetKeys={[keyword]}
      onReset={() => queryClient.resetQueries({ queryKey: ['posts'] })}
    >
      <PostsPanel keyword={keyword} />
    </AsyncBoundary>
  )
}

function PostsPanel({ keyword }: { keyword: string }) {
  const query = useSuspenseQuery({
    queryKey: ['posts', keyword],
    queryFn: fetchPosts,
  })

  return (
    <SuspenseQueryView
      query={query}
      refreshing={(content) => <div aria-busy>{content}</div>}
      empty={<EmptyState keyword={keyword} />}
    >
      {(posts) => <PostList posts={posts} />}
    </SuspenseQueryView>
  )
}
```

`SuspenseQueryView`는 개발 빌드에서 교체 층 상태가 들어오면 경고한다 — `useQuery`를 잘못 넘긴 경우를 잡는다.

`empty`가 경계로 올라가지 못하는 것도 같은 원리다. "결과가 비었다"는 판정은 data를 본 쪽만 할 수 있으니 가장 안쪽에 남는다.

전체 사용례는 `src/query-view.example.tsx`.

## API

### 컴포넌트

| 이름                | 역할                                                          |
| ------------------- | ------------------------------------------------------------- |
| `QueryView`         | `useQuery` 결과를 교체 + 중첩 슬롯으로 투영                   |
| `SuspenseQueryView` | `useSuspenseQuery` 결과를 중첩 슬롯 + `empty`로 투영          |
| `AsyncBoundary`     | 교체 층 전담 경계. `ErrorBoundary` + `Suspense`               |
| `ErrorBoundary`     | 동작하는 리셋 경로(`retry`, `resetKeys`)를 갖춘 에러 경계     |
| `Delayed`           | `delay` 이후에만 자식을 렌더. Suspense fallback의 깜빡임 방지 |
| `Collection`        | `empty` 슬롯만 단독으로                                       |

### 훅

| 이름             | 역할                                                   |
| ---------------- | ------------------------------------------------------ |
| `useDelayedFlag` | `delay` / `minDuration` 시간 정책으로 표시 여부를 감쌈 |
| `useElapsed`     | `tick` 간격 경과 시간(ms) 티커                         |

### 함수 · 타입

| 이름                                           | 역할                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `toQueryState`                                 | `QueryLike` → `QueryState` 분류. 이 라이브러리에서 Query의 형태를 아는 유일한 함수 |
| `hasData`                                      | `ready` / `degraded`로 좁히는 타입 가드                                            |
| `defaultIsEmpty`                               | 기본 empty 판정 (배열 · 문자열 · `Map` · `Set` · nullish)                          |
| `isAbortError`                                 | 취소 판별. 자동 적용되지 않으니 슬롯 안에서 직접 거른다                            |
| `assertNever`                                  | phase 추가를 컴파일 에러로 잡는 exhaustiveness 체크                                |
| `QueryState` · `QueryLike` · `QueryStateOf` 등 | 타입                                                                               |

## 시간 정책

`placeholder`에만 `delay`(기본 200ms)와 `minDuration`(기본 400ms)이 붙는다. 빠른 응답에 스켈레톤이 번쩍이는 것과, 스켈레톤이 한 프레임만 스치는 것을 동시에 막는다.

`fallback` 쪽엔 대응물이 없다. 실패는 즉시 확정된 사실이라 "너무 빨리 실패해서 안 보여준다"가 성립하지 않는다. 지연만이 시간에 대한 정책을 요구한다.

Suspense fallback에는 `minDuration`을 적용할 수 없다 — 데이터가 도착하면 React가 fallback 트리를 즉시 언마운트하므로 유지할 주체가 사라진다. 그래서 `Delayed`는 `delay`만 지킨다.

## empty 슬롯의 기본값

`empty`를 넘기지 않으면 결과가 비어도 `children`이 그대로 렌더된다. 빈 목록에 헤더나 툴바를 함께 그리는 화면이 많아, 슬롯을 생략했을 때 화면이 통째로 비는 쪽이 더 놀랍기 때문이다. 빈 결과를 명시적으로 지우려면 `empty={null}`을 넘긴다.

판정은 `defaultIsEmpty`가 하고, `isEmpty` prop으로 대체할 수 있다. 키 없는 plain object는 일부러 다루지 않는다 — `{}`가 빈 결과인지 필드가 전부 optional인 유효 응답인지는 도메인만 안다.

## Query는 `default`와 `placeholder`를 이미 정확히 구분한다

이 방향을 밀 근거이자, 이 분류가 외부에서 독립적으로 검증된 사례다.

| Query 옵션        | 캐시                                            | 분류          |
| ----------------- | ----------------------------------------------- | ------------- |
| `initialData`     | **들어감.** `staleTime` 적용받는 진짜 값        | `default`     |
| `placeholderData` | **안 들어감.** `isPlaceholderData: true`로 표시 | `placeholder` |

React가 Suspense에서 뭉갠 구분을 Query는 데이터 층에서 올바른 이름으로 갖고 있다. `provisional` 슬롯이 존재하는 이유가 여기다 — **placeholder가 렌더 층이 아니라 데이터 층에 있는 유일한 칸**이고, `placeholderData: keepPreviousData`는 한 술 더 떠 "이전 결과를 placeholder로 재활용"이라는 원래 분류에 없던 셀이다.

## 의도적으로 뺀 것: `stale` 오버레이

`isStale`은 `QueryState.ready`에 노출하지만 슬롯으로는 만들지 않았다. `staleTime` 기본값이 0이라 거의 항상 `true`이고, 슬롯으로 열어두면 상시 켜진 배너가 된다. 필요하면 `toQueryState`를 직접 써서 처리한다.

## 왜 범용 `Resource<T>` 어댑터가 아닌가

`Resource<T>` 4상태 유니온으로 Query를 받는 어댑터는 **손실 어댑터**다. 표현이 불가능한 것:

- `success` + `fetching` — 데이터가 **있으면서** 로딩 중. Query에서 가장 흔한 상태
- `error` + 이전 data — 위 `degraded` 전체
- `paused` — pending도 error도 아닌 제3의 축
- `isPlaceholderData` — 값은 있지만 대역

범용 모델로 투영하는 순간 원본의 절반이 날아간다. 손실 없는 투영을 하려면 대상 모델에 붙어야 하고, **결합이 버그가 아니라 이 설계의 기능**이다. 그 대가로 이건 범용 라이브러리가 아니라 Query 코드베이스의 컨벤션에 가깝다.

## 비용

- **버전 결합.** v4→v5에서 `isLoading`→`isPending`, `status: 'loading'`→`'pending'` 개명이 있었고 뷰 레이어가 그대로 먹는다. 현재 React 어댑터는 v5(5.10x 대)이고 v6은 Svelte/Solid 쪽이다.
- **완충 장치.** `QueryLike<T>`가 구조적 타입이라 `@tanstack/react-query`를 import하지 않는다. 개명이 오면 `types.ts`와 `toQueryState` 한 함수만 고치면 되고, 테스트에서 plain object로 상태를 주입할 수 있다.

## 테스트

```bash
pnpm test:run packages/query-view
```

| 파일                               | 검증 대상                                                     |
| ---------------------------------- | ------------------------------------------------------------- |
| `src/query-state.test.ts`          | 매트릭스 10칸 분류와 modifier                                 |
| `src/query-state.utils.test.ts`    | `hasData` · `defaultIsEmpty` · `isAbortError` · `assertNever` |
| `src/query-view.test.tsx`          | 교체/중첩 슬롯, 중첩 순서, `empty`, 재시도 경로               |
| `src/suspense-query-view.test.tsx` | 중첩 층 위임과 개발 빌드 경고                                 |
| `src/use-delayed-flag.test.tsx`    | `delay` / `minDuration` 시간 정책                             |
| `src/use-elapsed.test.tsx`         | `tick` 갱신과 정지                                            |
| `src/error-boundary.test.tsx`      | `retry` · `resetKeys` 리셋 경로                               |
| `src/async-boundary.test.tsx`      | Suspense 지연, 실패, 하위 트리 재마운트                       |
| `src/delayed.test.tsx`             | Suspense fallback 지연                                        |
| `src/collection.test.tsx`          | 단독 `empty` 슬롯                                             |
