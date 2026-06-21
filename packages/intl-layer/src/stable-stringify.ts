/**
 * 키 순서에 무관한 결정적 직렬화. `JSON.stringify`는 키 입력 순서에 따라 다른
 * 문자열을 내므로 formatter 캐시 키로 부적합하다. undefined 프로퍼티는 JSON과
 * 동일하게 제외한다.
 */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const entries = Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
  return `{${entries.join(',')}}`
}
