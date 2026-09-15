/**
 * 초 단위 시간을 "N시간 N분 N초" 형태의 한국어 문자열로 변환한다.
 *
 * 값이 0인 단위는 생략된다. 모든 단위가 0이면 빈 문자열을 반환한다.
 * 소수점 초는 받지 않으므로, 재생 위치처럼 실수인 값은 `Math.floor` 등으로
 * 먼저 정수로 만든 뒤 넘긴다.
 *
 * @param seconds - 변환할 시간(초). 0 이상의 정수
 * @returns 사람이 읽을 수 있는 한국어 시간 문자열. `0`이면 빈 문자열
 * @throws `seconds`가 음수이거나 정수가 아니면(`NaN`·`Infinity` 포함) `RangeError`
 * @example
 * ```ts
 * import { formatTimeFromSeconds } from '@cbcruk/utils'
 *
 * formatTimeFromSeconds(3661) // '1시간 1분 1초'
 * formatTimeFromSeconds(90) // '1분 30초'
 * formatTimeFromSeconds(0) // ''
 * formatTimeFromSeconds(Math.floor(90.7)) // '1분 30초'
 * ```
 */
export function formatTimeFromSeconds(seconds: number): string {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new RangeError(
      `seconds는 0 이상의 정수여야 합니다 (받은 값: ${seconds})`,
    )
  }

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return [h > 0 ? `${h}시간` : '', m > 0 ? `${m}분` : '', s > 0 ? `${s}초` : '']
    .filter(Boolean)
    .join(' ')
}
