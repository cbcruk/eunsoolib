import { Context, Data, Effect, Layer } from 'effect'

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

/** AirtableConfig 옵션 */
export type AirtableConfigOptions = {
  /** Airtable API 키 */
  apiKey: string
  /** Airtable Base URL */
  baseUrl: string
  /** 페이지당 레코드 수 (기본값: 20) */
  pageSize?: number
}

/** Airtable API 에러 */
export class AirtableError extends Data.TaggedError('AirtableError')<{
  readonly message: string
  readonly status?: number
  readonly cause?: unknown
}> {}

/** Airtable 설정 서비스 */
export class AirtableConfig extends Context.Tag('AirtableConfig')<
  AirtableConfig,
  {
    readonly apiKey: string
    readonly baseUrl: string
    readonly pageSize: number
  }
>() {}

/**
 * 쿼리 파라미터를 URL 쿼리 스트링으로 변환합니다.
 */
export const buildQuery = (params: Params): string => {
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
 * release 상태 필터 포뮬라를 생성합니다.
 * @param status - 상태 값 (기본값: 'release')
 */
export const releaseFormula = (status = 'release') => {
  return `AND({status}, '${status}')`
}

/**
 * 페이지네이션 필터 포뮬라를 생성합니다.
 * @param start - 시작 index
 * @param end - 끝 index
 */
export const paginationFormula = ({
  start,
  end,
}: {
  start: number
  end: number
}) => {
  return `AND(${releaseFormula()}, AND({index} >= ${start}, {index} <= ${end}))`
}

/**
 * 전체 레코드 수로 마지막 페이지 번호를 계산합니다.
 * @param total - 전체 레코드 수
 * @param pageSize - 페이지 크기
 */
export const getLastPage = (total: number, pageSize: number) => {
  return Math.ceil(total / pageSize)
}

/**
 * Airtable 테이블에서 레코드 목록을 조회합니다.
 * @template TFields - 레코드 필드 타입
 * @param url - 테이블 경로 (예: '/TableName')
 * @param params - Airtable API 파라미터 (filterByFormula, sort, fields 등)
 * @example
 * ```ts
 * const program = fetchList<{ name: string }>('/TableName', {
 *   filterByFormula: '{status} = "active"',
 * })
 *
 * Effect.runPromise(program.pipe(Effect.provide(AirtableConfigLive)))
 * ```
 */
export const fetchList = <TFields>(url: string, params: Params = {}) =>
  Effect.gen(function* () {
    const config = yield* AirtableConfig

    const query = buildQuery({
      pageSize: config.pageSize,
      ...params,
    })

    const fullUrl = `${config.baseUrl}${url}?${query}`

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(fullUrl, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        }),
      catch: (error) =>
        new AirtableError({
          message: 'Airtable API 요청 실패',
          cause: error,
        }),
    })

    if (!response.ok) {
      yield* Effect.fail(
        new AirtableError({
          message: `Airtable API 실패: ${response.statusText}`,
          status: response.status,
        })
      )
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<AirtableResponse<TFields>>,
      catch: (error) =>
        new AirtableError({
          message: 'Airtable API 응답 파싱 실패',
          cause: error,
        }),
    })

    return data
  })

/**
 * 테이블의 마지막 index 값을 조회합니다.
 * @param url - 테이블 경로
 */
export const getLastIndex = (url: string) =>
  Effect.gen(function* () {
    const result = yield* fetchList<{ index: number }>(url, {
      sort: [{ field: 'index', direction: 'desc' }],
      fields: ['index'],
      filterByFormula: releaseFormula(),
      pageSize: 1,
    })

    return result.records[0]?.fields.index
  })

/**
 * AirtableConfig Layer를 생성합니다.
 * @example
 * ```ts
 * const ConfigLive = makeAirtableConfigLayer({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.airtable.com/v0/your-base-id',
 * })
 *
 * Effect.runPromise(
 *   fetchList('/TableName', {}).pipe(Effect.provide(ConfigLive))
 * )
 * ```
 */
export const makeAirtableConfigLayer = (options: AirtableConfigOptions) =>
  Layer.succeed(AirtableConfig, {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    pageSize: options.pageSize ?? 20,
  })
