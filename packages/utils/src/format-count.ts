/**
 * 개수를 `K`(천)·`M`(백만) 단위의 짧은 문자열로 바꾼다.
 *
 * `1000` 미만은 그대로, 그 이상은 소수점 첫째 자리까지 반올림해 단위를 붙인다.
 * 반올림한 결과가 다음 단위에 닿으면 다음 단위로 올리므로 `999999`는
 * `'1000.0K'`가 아니라 `'1.0M'`이 된다. 가장 큰 단위는 `M`이다.
 *
 * @param count - 0 이상의 개수(조회수·재생 수 등)
 * @returns `'999'`, `'1.5K'`, `'2.3M'` 같은 문자열
 * @example
 * ```ts
 * import { formatCount } from '@cbcruk/utils'
 *
 * formatCount(999) // '999'
 * formatCount(1500) // '1.5K'
 * formatCount(999999) // '1.0M'
 * ```
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return String(count)
  }

  const thousands = (count / 1000).toFixed(1)

  // toFixed의 반올림 결과로 판단해야 999950 같은 값이 '1000.0K'로 남지 않는다.
  if (Number(thousands) < 1000) {
    return `${thousands}K`
  }

  return `${(count / 1_000_000).toFixed(1)}M`
}
