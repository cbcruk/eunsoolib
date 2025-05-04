export type Records<TFields> = Array<{
  id: string
  createdTime?: string
  fields: TFields
}>

export type AirtableResponse<TFields> = {
  records: Records<TFields>
  offset?: string
}

export type Params = Record<string, unknown>

export class AirtableClient {
  private apiKey: string
  private baseUrl: string
  private pageSize: number

  constructor({
    apiKey = process.env.AIRTABLE_API_KEY || '',
    baseUrl = process.env.AIRTABLE_URL || '',
    pageSize = 20,
  }: {
    apiKey: string
    baseUrl: string
    pageSize?: number
  }) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.pageSize = pageSize
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
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

  async fetchList<TFields>(
    url: string,
    params: Params
  ): Promise<AirtableResponse<TFields>> {
    const query = this.buildQuery({
      pageSize: this.pageSize,
      ...params,
    })

    const fullUrl = `${this.baseUrl}${url}?${query}`
    const response = await fetch(fullUrl, { headers: this.headers })

    if (!response.ok) {
      throw new Error(`실패: ${response.statusText}`)
    }

    return await response.json()
  }

  async getLastIndex(url: string): Promise<number | undefined> {
    const result = await this.fetchList<{ index: number }>(url, {
      sort: [{ field: 'index', direction: 'desc' }],
      fields: ['index'],
      filterByFormula: this.releaseFormula(),
      pageSize: 1,
    })

    return result.records[0]?.fields.index
  }

  releaseFormula(status = 'release') {
    return `AND({status}, '${status}')`
  }

  paginationFormula({ start, end }: { start: number; end: number }) {
    return `AND(${this.releaseFormula()}, AND({index} >= ${start}, {index} <= ${end}))`
  }

  getLastPage(total: number) {
    return Math.ceil(total / this.pageSize)
  }
}
