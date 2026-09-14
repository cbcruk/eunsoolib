/**
 * 숫자를 `K`/`M` 단위의 짧은 문자열로 바꾼다.
 *
 * `1000` 미만은 그대로, 그 이상은 소수점 첫째 자리까지 반올림해 `K`(천)나
 * `M`(백만)을 붙인다. 반올림 뒤 단위를 올리지 않으므로 `999999`는 `'1000.0K'`가 된다.
 *
 * @example
 * ```ts
 * import { formatCount } from '@cbcruk/audio-components'
 *
 * formatCount(1500) // '1.5K'
 * ```
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return String(count)
}
