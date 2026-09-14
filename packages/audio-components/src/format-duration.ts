/**
 * 초를 `mm:ss` 문자열로 바꾼다.
 *
 * 소수점 이하는 버리고, 한 시간 이상도 시간 단위 없이 분으로 센다
 * (`3665` → `'61:05'`).
 *
 * @example
 * ```ts
 * import { formatDuration } from '@cbcruk/audio-components'
 *
 * formatDuration(125) // '02:05'
 * ```
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`
}
