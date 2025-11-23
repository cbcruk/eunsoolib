# @eunsoolib/airtable

Airtable API를 위한 TypeScript 클라이언트 라이브러리

## 설치

```bash
pnpm add @eunsoolib/airtable
```

## 사용법

### 기본 클라이언트

```typescript
import { AirtableClient } from '@eunsoolib/airtable'

const client = new AirtableClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.airtable.com/v0/your-base-id',
  pageSize: 20, // 선택사항, 기본값: 20
})

// 레코드 조회
type MyRecord = { name: string; status: string }

const result = await client.fetchList<MyRecord>('/TableName', {
  filterByFormula: '{status} = "active"',
  sort: [{ field: 'name', direction: 'asc' }],
  fields: ['name', 'status'],
})

console.log(result.records) // AirtableRecord<MyRecord>[]
```

### 페이지네이션 클라이언트

index/status 필드 기반 페이지네이션이 필요한 경우:

```typescript
import { PaginatedAirtableClient } from '@eunsoolib/airtable'

const client = new PaginatedAirtableClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.airtable.com/v0/your-base-id',
})

// 마지막 index 조회
const lastIndex = await client.getLastIndex('/TableName')

// 페이지네이션 포뮬라 생성
const formula = client.paginationFormula({ start: 1, end: 10 })
// => "AND(AND({status}, 'release'), AND({index} >= 1, {index} <= 10))"

// 마지막 페이지 계산
const lastPage = client.getLastPage(100) // totalCount
```

## 환경 변수

옵션을 생략하면 환경 변수에서 값을 가져옵니다:

```env
AIRTABLE_API_KEY=your-api-key
AIRTABLE_URL=https://api.airtable.com/v0/your-base-id
```

## API

### AirtableClient

| 메서드                      | 설명             |
| --------------------------- | ---------------- |
| `fetchList<T>(url, params)` | 레코드 목록 조회 |

### PaginatedAirtableClient

`AirtableClient`를 상속하며 추가 메서드 제공:

| 메서드                              | 설명                          |
| ----------------------------------- | ----------------------------- |
| `getLastIndex(url)`                 | 마지막 index 값 조회          |
| `releaseFormula(status?)`           | release 상태 필터 포뮬라 생성 |
| `paginationFormula({ start, end })` | 페이지네이션 필터 포뮬라 생성 |
| `getLastPage(total)`                | 마지막 페이지 번호 계산       |

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

type AirtableClientOptions = {
  apiKey?: string
  baseUrl?: string
  pageSize?: number
}
```
