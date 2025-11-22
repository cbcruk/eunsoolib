export type AirtableRecord<TFields> = {
  id: string
  createdTime?: string
  fields: TFields
}

export type AirtableResponse<TFields> = {
  records: AirtableRecord<TFields>[]
  offset?: string
}

export type Params = Record<string, unknown>

export type AirtableClientOptions = {
  apiKey?: string
  baseUrl?: string
  pageSize?: number
}

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
      throw new Error(`Airtable API 실패 (${response.status}): ${response.statusText}`)
    }

    return response.json()
  }
}

export class PaginatedAirtableClient extends AirtableClient {
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
    return Math.ceil(total / this.options.pageSize)
  }
}
