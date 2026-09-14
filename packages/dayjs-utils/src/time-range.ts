import dayjs, { Dayjs } from 'dayjs'
import isBetweenPlugin from 'dayjs/plugin/isBetween'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(isBetweenPlugin)
dayjs.extend(customParseFormat)

/** 시/분/초를 각각 2자리 문자열로 담은 구조 */
export type TimeParts = {
  HH: string
  mm: string
  ss: string
}

type Time = string
type StartTime = Time
type EndTime = Time

/**
 * 하루 중 특정 시간대(예: `'09:00:00'` ~ `'18:00:00'`)를 다루는 유틸리티
 *
 * 날짜는 무시하고 "오늘"의 시각으로만 계산하므로, 매일 반복되는 운영 시간이나
 * 이벤트 시간대를 판정할 때 쓴다. 시작은 포함하고 끝은 제외한다(`[)`).
 *
 * @example
 * ```ts
 * import { TimeRange } from '@cbcruk/dayjs-utils'
 *
 * const range = new TimeRange('09:00:00', '18:00:00')
 * range.isActive() // 지금이 영업 시간인지
 * range.getRemainingTime() // { HH: '02', mm: '30', ss: '00' }
 * ```
 */
export class TimeRange {
  protected startTime: StartTime
  protected endTime: EndTime

  /**
   * @param startTime - 시작 시각 (`HH:mm:ss`)
   * @param endTime - 종료 시각 (`HH:mm:ss`)
   */
  constructor(startTime: StartTime, endTime: EndTime) {
    this.startTime = startTime
    this.endTime = endTime
  }

  /**
   * `HH:mm:ss` 문자열을 오늘 날짜의 dayjs 객체로 변환
   *
   * @throws 형식이 `HH:mm:ss`가 아닌 경우
   */
  protected toDatetime(time: Time) {
    const parsed = dayjs(time, 'HH:mm:ss', true)

    if (!parsed.isValid()) {
      throw new Error(`Invalid time string: "${time}"`)
    }

    const today = dayjs()

    return today
      .hour(parsed.hour())
      .minute(parsed.minute())
      .second(parsed.second())
      .millisecond(0)
  }

  /**
   * 주어진 시각이 시간대 안에 있는지 판정
   *
   * @param now - 기준 시각. 기본값은 현재 시각
   * @returns 범위 안이면 `true`. 시간 형식이 잘못된 경우에도 `false`
   */
  isActive(now: Dayjs = dayjs()): boolean {
    try {
      return now.isBetween(
        this.toDatetime(this.startTime),
        this.toDatetime(this.endTime),
        undefined,
        '[)',
      )
    } catch {
      return false
    }
  }

  /**
   * 종료 시각까지 남은 시간을 계산
   *
   * @param now - 기준 시각. 기본값은 현재 시각
   * @returns 남은 시간({@link TimeParts}). 이미 지났으면 `'00:00:00'`,
   * 시간 형식이 잘못됐으면 `null`
   */
  getRemainingTime(now: Dayjs = dayjs()) {
    try {
      const end = this.toDatetime(this.endTime)
      const diffMs = end.diff(now)

      if (diffMs <= 0) {
        return {
          HH: '00',
          mm: '00',
          ss: '00',
        }
      }

      const seconds = Math.floor(diffMs / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      return {
        HH: `${hours}`.padStart(2, '0'),
        mm: `${minutes % 60}`.padStart(2, '0'),
        ss: `${seconds % 60}`.padStart(2, '0'),
      }
    } catch {
      return null
    }
  }

  /**
   * `HH:mm:ss` 문자열을 시/분/초로 분해
   *
   * @param time - 분해할 시각 문자열
   * @returns 누락된 단위는 `'00'`으로 채운 {@link TimeParts}
   */
  static parseTime(time: Time) {
    const [HH = '00', mm = '00', ss = '00'] = time.split(':')

    return {
      HH,
      mm,
      ss,
    }
  }

  /** 현재 시각을 `HH:mm:ss` 문자열로 반환 */
  static now() {
    return dayjs().format('HH:mm:ss')
  }
}
