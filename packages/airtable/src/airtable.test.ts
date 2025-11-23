import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Effect } from 'effect'
import {
  buildQuery,
  releaseFormula,
  paginationFormula,
  getLastPage,
  fetchList,
  getLastIndex,
  makeAirtableConfigLayer,
} from './airtable'

const dummyRecords = [
  { id: 'rec1', fields: { index: 100 } },
  { id: 'rec2', fields: { index: 99 } },
]

const mockFetchResponse = {
  ok: true,
  json: async () => ({
    records: dummyRecords,
    offset: 'dummyOffset',
  }),
}

const TestConfigLayer = makeAirtableConfigLayer({
  apiKey: 'test-key',
  baseUrl: 'https://api.airtable.com/v0/testbase',
  pageSize: 20,
})

describe('Utils', () => {
  it('buildQuery가 쿼리 파라미터를 올바르게 생성해야 함', () => {
    const query = buildQuery({
      filterByFormula: 'AND({status} = "release")',
      sort: [{ field: 'index', direction: 'desc' }],
    })

    expect(decodeURIComponent(query)).toContain('filterByFormula=')
    expect(decodeURIComponent(query)).toContain('sort[0][field]=index')
    expect(decodeURIComponent(query)).toContain('sort[0][direction]=desc')
  })

  it('releaseFormula가 올바른 포뮬라를 생성해야 함', () => {
    expect(releaseFormula()).toBe(`AND({status}, 'release')`)
    expect(releaseFormula('draft')).toBe(`AND({status}, 'draft')`)
  })

  it('paginationFormula가 범위 조건을 포함해야 함', () => {
    const result = paginationFormula({ start: 10, end: 20 })
    expect(result).toContain('{index} >= 10')
    expect(result).toContain('{index} <= 20')
  })

  it('getLastPage가 마지막 페이지를 계산해야 함', () => {
    expect(getLastPage(100, 20)).toBe(5)
    expect(getLastPage(101, 20)).toBe(6)
    expect(getLastPage(0, 20)).toBe(0)
  })
})

describe('Effects', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse)
  })

  it('fetchList가 레코드를 조회해야 함', async () => {
    const program = fetchList<{ index: number }>('/Table%201', {
      filterByFormula: 'test',
    }).pipe(Effect.provide(TestConfigLayer))

    const result = await Effect.runPromise(program)

    expect(global.fetch).toHaveBeenCalled()
    expect(result.records.length).toBe(2)
    expect(result.records[0].fields.index).toBe(100)
  })

  it('getLastIndex가 마지막 인덱스를 반환해야 함', async () => {
    const program = getLastIndex('/Table%201').pipe(Effect.provide(TestConfigLayer))

    const result = await Effect.runPromise(program)

    expect(result).toBe(100)
  })

  it('fetchList가 API 실패 시 AirtableError를 반환해야 함', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const program = fetchList('/Table%201', {}).pipe(
      Effect.provide(TestConfigLayer),
      Effect.flip // 에러를 성공값으로 변환
    )

    const error = await Effect.runPromise(program)

    expect(error._tag).toBe('AirtableError')
    expect(error.status).toBe(401)
  })
})
