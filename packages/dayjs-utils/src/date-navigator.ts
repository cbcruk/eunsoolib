import dayjs from 'dayjs'

/**
 * 하루 단위로 앞뒤를 이동하는 날짜 커서
 *
 * 내부 상태를 변경(mutate)하며, 모든 조회는 생성자에 넘긴 포맷 문자열로
 * 직렬화된다.
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
 */
export class DateNavigator {
  private format: string
  private current: dayjs.Dayjs

  /**
   * @param initialDate - 시작 날짜 (`format`과 같은 형식)
   * @param format - 파싱/출력에 사용할 dayjs 포맷. 기본값 `'YYYY-MM-DD'`
   */
  constructor(initialDate: string, format = 'YYYY-MM-DD') {
    this.format = format
    this.current = dayjs(initialDate, format)
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
   * @param date - 새 날짜 (`format`과 같은 형식)
   */
  set(date: string) {
    this.current = dayjs(date, this.format)
  }

  /** 현재 날짜를 포맷 문자열로 반환 */
  get() {
    return this.toString()
  }
}
