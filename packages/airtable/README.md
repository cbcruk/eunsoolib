# @eunsoolib/airtable

Effect 기반 Airtable API 클라이언트 라이브러리

## 설치

```bash
pnpm add @eunsoolib/airtable effect
```

## 사용법

### 기본 사용

```typescript
import { Effect } from 'effect'
import { fetchList, makeAirtableConfigLayer } from '@eunsoolib/airtable'

// Layer 생성
const ConfigLayer = makeAirtableConfigLayer({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.airtable.com/v0/your-base-id',
  pageSize: 20, // 선택사항, 기본값: 20
})

// 레코드 조회
type MyRecord = { name: string; status: string }

const program = fetchList<MyRecord>('/TableName', {
  filterByFormula: '{status} = "active"',
  sort: [{ field: 'name', direction: 'asc' }],
  fields: ['name', 'status'],
})

// 실행
Effect.runPromise(program.pipe(Effect.provide(ConfigLayer)))
  .then((result) => console.log(result.records))
  .catch((error) => console.error(error))
```

### 페이지네이션 유틸리티

```typescript
import {
  getLastIndex,
  releaseFormula,
  paginationFormula,
  getLastPage,
  makeAirtableConfigLayer,
} from '@eunsoolib/airtable'
import { Effect } from 'effect'

const ConfigLayer = makeAirtableConfigLayer({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.airtable.com/v0/your-base-id',
})

// 마지막 index 조회
const lastIndex = await Effect.runPromise(
  getLastIndex('/TableName').pipe(Effect.provide(ConfigLayer))
)

// 포뮬라 생성 (순수 함수)
const formula = paginationFormula({ start: 1, end: 10 })
// => "AND(AND({status}, 'release'), AND({index} >= 1, {index} <= 10))"

// 마지막 페이지 계산 (순수 함수)
const lastPage = getLastPage(100, 20) // => 5
```

### 에러 처리

```typescript
import { Effect } from 'effect'
import { fetchList, AirtableError, makeAirtableConfigLayer } from '@eunsoolib/airtable'

const ConfigLayer = makeAirtableConfigLayer({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.airtable.com/v0/your-base-id',
})

const program = fetchList('/TableName', {}).pipe(
  Effect.provide(ConfigLayer),
  Effect.catchTag('AirtableError', (error) => {
    console.error(`API 에러 (${error.status}): ${error.message}`)
    return Effect.succeed({ records: [], offset: undefined })
  })
)
```

## API

### Effects

| 함수                        | 설명                    |
| --------------------------- | ----------------------- |
| `fetchList<T>(url, params)` | 레코드 목록 조회        |
| `getLastIndex(url)`         | 마지막 index 값 조회    |

### Utils (순수 함수)

| 함수                              | 설명                          |
| --------------------------------- | ----------------------------- |
| `buildQuery(params)`              | 쿼리 파라미터를 문자열로 변환 |
| `releaseFormula(status?)`         | release 상태 필터 포뮬라 생성 |
| `paginationFormula({ start, end })` | 페이지네이션 필터 포뮬라 생성 |
| `getLastPage(total, pageSize)`    | 마지막 페이지 번호 계산       |

### Layers

| 함수                           | 설명                     |
| ------------------------------ | ------------------------ |
| `makeAirtableConfigLayer(options)` | AirtableConfig Layer 생성 |

### Types

```typescript
type AirtableRecord<TFields> = {
  id: string
  createdTime?: string
  fields: TFields
}

type AirtableResponse<TFields> = {
  records: AirtableRecord<TFields>[]
  offset?: string
}

type AirtableConfigOptions = {
  apiKey: string
  baseUrl: string
  pageSize?: number
}
```

### Errors

```typescript
class AirtableError extends Data.TaggedError('AirtableError')<{
  readonly message: string
  readonly status?: number
  readonly cause?: unknown
}>
```
