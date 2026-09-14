/**
 * 초 단위 시간을 "N시간 N분 N초" 형태의 한국어 문자열로 변환
 *
 * 값이 0인 단위는 생략된다. 모든 단위가 0이면 빈 문자열을 반환한다.
 *
 * @param seconds - 변환할 시간(초)
 * @returns 사람이 읽을 수 있는 한국어 시간 문자열
 * @example
 * ```ts
 * import { formatTimeFromSeconds } from '@cbcruk/utils'
 *
 * formatTimeFromSeconds(3661) // '1시간 1분 1초'
 * formatTimeFromSeconds(90) // '1분 30초'
 * formatTimeFromSeconds(0) // ''
 * ```
 */
export function formatTimeFromSeconds(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return [h > 0 ? `${h}시간` : '', m > 0 ? `${m}분` : '', s > 0 ? `${s}초` : '']
    .filter(Boolean)
    .join(' ')
}
