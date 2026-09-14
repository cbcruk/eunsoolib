import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// 커스텀 포맷 파싱에 필요한 플러그인을 다른 모듈의 부작용에 기대지 않고 직접 등록한다
dayjs.extend(customParseFormat)

/**
 * 하루 단위로 앞뒤를 이동하는 날짜 커서
 *
 * 내부 상태를 변경(mutate)하며, 모든 조회는 생성자에 넘긴 포맷 문자열로
 * 직렬화된다. 날짜 문자열은 `format`으로 strict 파싱하므로 형식이 다르거나
 * 존재하지 않는 날짜(`'2025-02-30'` 등)는 예외를 던진다.
 *
 * @example
 * ```ts
 * import { DateNavigator } from '@cbcruk/dayjs-utils'
 *
 * const nav = new DateNavigator('2024-01-01')
 * nav.next() // '2024-01-02'
 * nav.previous() // '2024-01-01'
 * nav.set('2024-03-15')
 * nav.get() // '2024-03-15'
 * ```
 *
 * @example 커스텀 포맷
 * ```ts
 * import { DateNavigator } from '@cbcruk/dayjs-utils'
 *
 * const nav = new DateNavigator('06-05-2025', 'DD-MM-YYYY')
 * nav.next() // '07-05-2025'
 * ```
 */
export class DateNavigator {
  private format: string
  private current: dayjs.Dayjs

  /**
   * @param initialDate - 시작 날짜 (`format`과 같은 형식)
   * @param format - 파싱/출력에 사용할 dayjs 포맷. 기본값 `'YYYY-MM-DD'`
   * @throws `initialDate`가 `format`에 맞는 유효한 날짜가 아닌 경우
   */
  constructor(initialDate: string, format = 'YYYY-MM-DD') {
    this.format = format
    this.current = this.parse(initialDate)
  }

  /** `format`으로 strict 파싱하고, 유효하지 않으면 예외를 던진다 */
  private parse(date: string) {
    const parsed = dayjs(date, this.format, true)

    if (!parsed.isValid()) {
      throw new Error(`Invalid date string: "${date}" (format: ${this.format})`)
    }

    return parsed
  }

  /** 현재 날짜를 포맷 문자열로 반환 */
  toString() {
    return this.current.format(this.format)
  }

  /**
   * 하루 뒤로 이동
   * @returns 이동한 날짜 문자열
   */
  next() {
    this.current = this.current.add(1, 'day')

    return this.toString()
  }

  /**
   * 하루 앞으로 이동
   * @returns 이동한 날짜 문자열
   */
  previous() {
    this.current = this.current.subtract(1, 'day')

    return this.toString()
  }

  /**
   * 현재 날짜를 지정한 값으로 교체
   *
   * 유효하지 않은 값이면 예외를 던지고 현재 날짜는 그대로 둔다.
   *
   * @param date - 새 날짜 (`format`과 같은 형식)
   * @throws `date`가 `format`에 맞는 유효한 날짜가 아닌 경우
   */
  set(date: string) {
    this.current = this.parse(date)
  }

  /** 현재 날짜를 포맷 문자열로 반환 */
  get() {
    return this.toString()
  }
}
