/**
 * Airtable 레코드 타입
 * @template TFields - 레코드 필드 타입
 */
export type AirtableRecord<TFields> = {
  id: string
  createdTime?: string
  fields: TFields
}

/**
 * Airtable API 응답 타입
 * @template TFields - 레코드 필드 타입
 */
export type AirtableResponse<TFields> = {
  records: AirtableRecord<TFields>[]
  offset?: string
}

/** Airtable API 쿼리 파라미터 타입 */
export type Params = Record<string, unknown>

/** AirtableClient 생성 옵션 */
export type AirtableClientOptions = {
  /** Airtable API 키 (기본값: process.env.AIRTABLE_API_KEY) */
  apiKey?: string
  /** Airtable Base URL (기본값: process.env.AIRTABLE_URL) */
  baseUrl?: string
  /** 페이지당 레코드 수 (기본값: 20) */
  pageSize?: number
}

/**
 * Airtable API 클라이언트
 * @example
 * ```ts
 * const client = new AirtableClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.airtable.com/v0/your-base-id',
 * })
 *
 * const result = await client.fetchList<{ name: string }>('/TableName', {
 *   filterByFormula: '{status} = "active"',
 * })
 * ```
 */
export class AirtableClient {
  protected options: Required<AirtableClientOptions>

  constructor(options: AirtableClientOptions) {
    this.options = {
      apiKey: options.apiKey ?? process.env.AIRTABLE_API_KEY ?? '',
      baseUrl: options.baseUrl ?? process.env.AIRTABLE_URL ?? '',
      pageSize: options.pageSize ?? 20,
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
    }
  }

  private buildQuery(params: Params): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          if (typeof v === 'object') {
            Object.entries(v).forEach(([k, val]) => {
              searchParams.append(`${key}[${i}][${k}]`, `${val}`)
            })
          } else {
            searchParams.append(`${key}[]`, `${v}`)
          }
        })
      } else {
        searchParams.append(key, `${value}`)
      }
    })

    return searchParams.toString()
  }

  /**
   * Airtable 테이블에서 레코드 목록을 조회합니다.
   * @template TFields - 레코드 필드 타입
   * @param url - 테이블 경로 (예: '/TableName')
   * @param params - Airtable API 파라미터 (filterByFormula, sort, fields 등)
   * @returns Airtable API 응답
   * @throws {Error} API 요청 실패 시
   */
  async fetchList<TFields>(
    url: string,
    params: Params
  ): Promise<AirtableResponse<TFields>> {
    const query = this.buildQuery({
      pageSize: this.options.pageSize,
      ...params,
    })

    const fullUrl = `${this.options.baseUrl}${url}?${query}`
    const response = await fetch(fullUrl, { headers: this.headers })

    if (!response.ok) {
      throw new Error(
        `Airtable API 실패 (${response.status}): ${response.statusText}`
      )
    }

    return response.json()
  }
}

/**
 * 페이지네이션 기능이 추가된 Airtable 클라이언트
 * index/status 필드 기반 페이지네이션을 지원합니다.
 * @extends AirtableClient
 * @example
 * ```ts
 * const client = new PaginatedAirtableClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.airtable.com/v0/your-base-id',
 * })
 *
 * const lastIndex = await client.getLastIndex('/TableName')
 * const formula = client.paginationFormula({ start: 1, end: 10 })
 * ```
 */
export class PaginatedAirtableClient extends AirtableClient {
  /**
   * 테이블의 마지막 index 값을 조회합니다.
   * @param url - 테이블 경로
   * @returns 마지막 index 값 (레코드가 없으면 undefined)
   */
  async getLastIndex(url: string): Promise<number | undefined> {
    const result = await this.fetchList<{ index: number }>(url, {
      sort: [{ field: 'index', direction: 'desc' }],
      fields: ['index'],
      filterByFormula: this.releaseFormula(),
      pageSize: 1,
    })

    return result.records[0]?.fields.index
  }

  /**
   * release 상태 필터 포뮬라를 생성합니다.
   * @param status - 상태 값 (기본값: 'release')
   * @returns Airtable 필터 포뮬라
   */
  releaseFormula(status = 'release') {
    return `AND({status}, '${status}')`
  }

  /**
   * 페이지네이션 필터 포뮬라를 생성합니다.
   * @param options - 시작/끝 index
   * @param options.start - 시작 index
   * @param options.end - 끝 index
   * @returns Airtable 필터 포뮬라
   */
  paginationFormula({ start, end }: { start: number; end: number }) {
    return `AND(${this.releaseFormula()}, AND({index} >= ${start}, {index} <= ${end}))`
  }

  /**
   * 전체 레코드 수로 마지막 페이지 번호를 계산합니다.
   * @param total - 전체 레코드 수
   * @returns 마지막 페이지 번호
   */
  getLastPage(total: number) {
    return Math.ceil(total / this.options.pageSize)
  }
}
