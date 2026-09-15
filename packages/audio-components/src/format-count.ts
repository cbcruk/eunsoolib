import { formatCount as formatCountFromUtils } from '@cbcruk/utils'

/**
 * 개수를 `K`(천)·`M`(백만) 단위의 짧은 문자열로 바꾼다.
 *
 * 오디오와 관계없는 범용 포맷터라 `@cbcruk/utils`로 옮겼다. 기존 import가 깨지지
 * 않도록 같은 함수를 다시 내보낸다.
 *
 * @deprecated `@cbcruk/utils`의 `formatCount`를 사용한다.
 * @example
 * ```ts
 * import { formatCount } from '@cbcruk/utils'
 *
 * formatCount(1500) // '1.5K'
 * formatCount(999999) // '1.0M'
 * ```
 */
export const formatCount: (count: number) => string = formatCountFromUtils
