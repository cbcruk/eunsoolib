import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AirtableClient } from './airtable'

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

describe('AirtableClient', () => {
  const apiKey = 'test-key'
  const baseUrl = 'https://api.airtable.com/v0/testbase'

  let client: AirtableClient

  beforeEach(() => {
    client = new AirtableClient({ apiKey, baseUrl })
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse)
  })

  it('buildQuery', () => {
    const query = (client as any).buildQuery({
      filterByFormula: 'AND({status} = "release")',
      sort: [{ field: 'index', direction: 'desc' }],
    })

    expect(decodeURIComponent(query)).toContain('filterByFormula=')
    expect(decodeURIComponent(query)).toContain('sort[0][field]=index')
    expect(decodeURIComponent(query)).toContain('sort[0][direction]=desc')
  })

  it('releaseFormula', () => {
    expect(client.releaseFormula()).toBe(`AND({status}, 'release')`)
    expect(client.releaseFormula('draft')).toBe(`AND({status}, 'draft')`)
  })

  it('paginationFormula', () => {
    const result = client.paginationFormula({ start: 10, end: 20 })
    expect(result).toContain('{index} >= 10')
    expect(result).toContain('{index} <= 20')
  })

  it('fetchList', async () => {
    const result = await client.fetchList<{ index: number }>('/Table%201', {
      filterByFormula: 'test',
    })

    expect(global.fetch).toHaveBeenCalled()
    expect(result.records.length).toBe(2)
    expect(result.records[0].fields.index).toBe(100)
  })

  it('getLastIndex', async () => {
    const index = await client.getLastIndex('/Table%201')
    expect(index).toBe(100)
  })
})
