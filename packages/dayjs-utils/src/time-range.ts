import dayjs, { Dayjs } from 'dayjs'
import isBetweenPlugin from 'dayjs/plugin/isBetween'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// 이 모듈이 쓰는 플러그인은 다른 모듈의 부작용에 기대지 않고 직접 등록한다
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
 * 시각만 받아 기준 시각(`now`)의 날짜에 붙여 계산하므로, 매일 반복되는 운영
 * 시간이나 이벤트 시간대를 판정할 때 쓴다. 시작은 포함하고 끝은 제외한다(`[)`).
 * `endTime`이 `startTime`보다 이르면(예: `'22:00:00'` ~ `'02:00:00'`) 자정을 넘어
 * 다음 날까지 이어지는 구간으로 본다.
 *
 * @example
 * ```ts
 * import { TimeRange } from '@cbcruk/dayjs-utils'
 *
 * const range = new TimeRange('09:00:00', '18:00:00')
 * range.isActive() // 지금이 영업 시간인지
 * range.getRemainingTime() // { HH: '02', mm: '30', ss: '00' }
 * ```
 *
 * @example 자정을 넘는 구간
 * ```ts
 * import dayjs from 'dayjs'
 * import { TimeRange } from '@cbcruk/dayjs-utils'
 *
 * const night = new TimeRange('22:00:00', '02:00:00')
 * night.isActive(dayjs('2025-05-06T23:30:00')) // true
 * night.isActive(dayjs('2025-05-07T01:00:00')) // true
 * night.getRemainingTime(dayjs('2025-05-06T23:30:00')) // { HH: '02', mm: '30', ss: '00' }
 * ```
 */
export class TimeRange {
  protected startTime: StartTime
  protected endTime: EndTime

  /**
   * @param startTime - 시작 시각 (`HH:mm:ss`)
   * @param endTime - 종료 시각 (`HH:mm:ss`). `startTime`보다 이르면 다음 날 시각으로 본다
   */
  constructor(startTime: StartTime, endTime: EndTime) {
    this.startTime = startTime
    this.endTime = endTime
  }

  /**
   * `HH:mm:ss` 문자열을 기준 시각과 같은 날짜의 dayjs 객체로 변환
   *
   * @param time - 변환할 시각 (`HH:mm:ss`)
   * @param base - 날짜를 가져올 기준 시각. 기본값은 현재 시각
   * @throws 형식이 `HH:mm:ss`가 아닌 경우
   */
  protected toDatetime(time: Time, base: Dayjs = dayjs()) {
    const parsed = dayjs(time, 'HH:mm:ss', true)

    if (!parsed.isValid()) {
      throw new Error(`Invalid time string: "${time}"`)
    }

    return base
      .hour(parsed.hour())
      .minute(parsed.minute())
      .second(parsed.second())
      .millisecond(0)
  }

  /** `endTime`이 `startTime`보다 일러 자정을 넘는 구간인지 */
  private crossesMidnight(start: Dayjs, end: Dayjs) {
    return end.isBefore(start)
  }

  /**
   * 주어진 시각이 시간대 안에 있는지 판정
   *
   * 시각은 `now`의 날짜에 붙여 비교한다. 자정을 넘는 구간은 `startTime` 이후이거나
   * `endTime` 이전이면 안으로 본다. `startTime`과 `endTime`이 같으면 빈 구간이다.
   *
   * @param now - 기준 시각. 기본값은 현재 시각
   * @returns 범위 안이면 `true`. 시간 형식이 잘못된 경우에도 `false`
   */
  isActive(now: Dayjs = dayjs()): boolean {
    try {
      const start = this.toDatetime(this.startTime, now)
      const end = this.toDatetime(this.endTime, now)

      if (this.crossesMidnight(start, end)) {
        return !now.isBefore(start) || now.isBefore(end)
      }

      return now.isBetween(start, end, undefined, '[)')
    } catch {
      return false
    }
  }

  /**
   * 종료 시각까지 남은 시간을 계산
   *
   * 종료 시각은 `now`의 날짜 기준이다. 자정을 넘는 구간에서 `now`가 그날의
   * `endTime` 이후라면 다음 날 `endTime`까지 계산한다.
   *
   * @param now - 기준 시각. 기본값은 현재 시각
   * @returns 남은 시간({@link TimeParts}). 이미 지났으면 `'00:00:00'`,
   * 시간 형식이 잘못됐으면 `null`
   */
  getRemainingTime(now: Dayjs = dayjs()): TimeParts | null {
    try {
      const start = this.toDatetime(this.startTime, now)
      let end = this.toDatetime(this.endTime, now)

      if (this.crossesMidnight(start, end) && !now.isBefore(end)) {
        end = end.add(1, 'day')
      }

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
