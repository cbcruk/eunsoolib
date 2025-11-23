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

/** AirtableConfig 옵션 */
export type AirtableConfigOptions = {
  /** Airtable API 키 */
  apiKey: string
  /** Airtable Base URL */
  baseUrl: string
  /** 페이지당 레코드 수 (기본값: 20) */
  pageSize?: number
}
