import { describe, it, expect } from 'vitest'
import { buildQuery } from './build-query'

describe('buildQuery', () => {
  describe('단일 값', () => {
    it('문자열 값을 쿼리 스트링으로 변환', () => {
      const result = buildQuery({ filterByFormula: '{status} = "active"' })
      // URLSearchParams는 공백을 +로 인코딩
      expect(decodeURIComponent(result)).toBe('filterByFormula={status}+=+"active"')
    })

    it('숫자 값을 쿼리 스트링으로 변환', () => {
      const result = buildQuery({ pageSize: 20 })
      expect(result).toBe('pageSize=20')
    })

    it('null/undefined 값은 무시', () => {
      const result = buildQuery({ a: 'value', b: null, c: undefined })
      expect(result).toBe('a=value')
    })
  })

  describe('원시값 배열', () => {
    it('문자열 배열을 key[] 형태로 변환', () => {
      const result = buildQuery({ fields: ['name', 'email'] })
      expect(decodeURIComponent(result)).toBe('fields[]=name&fields[]=email')
    })

    it('배열 내 null/undefined는 무시', () => {
      const result = buildQuery({ fields: ['name', null, 'email', undefined] })
      expect(decodeURIComponent(result)).toBe('fields[]=name&fields[]=email')
    })
  })

  describe('객체 배열', () => {
    it('객체 배열을 key[i][k] 형태로 변환', () => {
      const result = buildQuery({
        sort: [{ field: 'name', direction: 'asc' }],
      })
      expect(decodeURIComponent(result)).toBe(
        'sort[0][field]=name&sort[0][direction]=asc'
      )
    })

    it('여러 객체를 인덱스로 구분', () => {
      const result = buildQuery({
        sort: [
          { field: 'name', direction: 'asc' },
          { field: 'date', direction: 'desc' },
        ],
      })
      expect(decodeURIComponent(result)).toContain('sort[0][field]=name')
      expect(decodeURIComponent(result)).toContain('sort[1][field]=date')
    })

    it('객체 내 null/undefined 값은 무시', () => {
      const result = buildQuery({
        sort: [{ field: 'name', direction: null }],
      })
      expect(decodeURIComponent(result)).toBe('sort[0][field]=name')
    })
  })

  describe('복합 케이스', () => {
    it('Airtable API 파라미터 조합', () => {
      const result = buildQuery({
        pageSize: 10,
        filterByFormula: '{status} = "release"',
        sort: [{ field: 'index', direction: 'desc' }],
        fields: ['name', 'status'],
      })

      const decoded = decodeURIComponent(result)
      expect(decoded).toContain('pageSize=10')
      expect(decoded).toContain('filterByFormula={status}+=+"release"')
      expect(decoded).toContain('sort[0][field]=index')
      expect(decoded).toContain('fields[]=name')
    })
  })
})
