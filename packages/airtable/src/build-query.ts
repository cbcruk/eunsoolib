/** Airtable API 쿼리 파라미터 타입 */
export type Params = Record<string, unknown>

type AppendArrayParams = {
  searchParams: URLSearchParams
  key: string
  arr: unknown[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const appendObjectArray = ({ searchParams, key, arr }: AppendArrayParams) => {
  arr.forEach((item, i) => {
    if (!isObject(item)) return

    Object.entries(item).forEach(([k, val]) => {
      if (val == null) return
      searchParams.append(`${key}[${i}][${k}]`, String(val))
    })
  })
}

const appendPrimitiveArray = ({ searchParams, key, arr }: AppendArrayParams) => {
  arr.forEach((item) => {
    if (item == null) return
    searchParams.append(`${key}[]`, String(item))
  })
}

const appendArrayParam = (params: AppendArrayParams) => {
  const hasObjectItem = params.arr.some(isObject)

  if (hasObjectItem) {
    appendObjectArray(params)
  } else {
    appendPrimitiveArray(params)
  }
}

/**
 * 쿼리 파라미터를 Airtable API 형식의 URL 쿼리 스트링으로 변환합니다.
 * @param params - 쿼리 파라미터 객체
 * @returns URL 쿼리 스트링
 * @example
 * ```ts
 * buildQuery({ filterByFormula: '{status} = "active"' })
 * // => "filterByFormula=%7Bstatus%7D+%3D+%22active%22"
 *
 * buildQuery({ sort: [{ field: 'name', direction: 'asc' }] })
 * // => "sort[0][field]=name&sort[0][direction]=asc"
 *
 * buildQuery({ fields: ['name', 'email'] })
 * // => "fields[]=name&fields[]=email"
 * ```
 */
export const buildQuery = (params: Params): string => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return

    if (Array.isArray(value)) {
      appendArrayParam({ searchParams, key, arr: value })
    } else {
      searchParams.append(key, String(value))
    }
  })

  return searchParams.toString()
}
