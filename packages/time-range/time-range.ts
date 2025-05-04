import dayjs, { Dayjs } from 'dayjs'
import isBetweenPlugin from 'dayjs/plugin/isBetween'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(isBetweenPlugin)
dayjs.extend(customParseFormat)

export type TimeParts = {
  HH: string
  mm: string
  ss: string
}

type Time = string
type StartTime = Time
type EndTime = Time

export class TimeRange {
  protected startTime: StartTime
  protected endTime: EndTime

  constructor(startTime: StartTime, endTime: EndTime) {
    this.startTime = startTime
    this.endTime = endTime
  }

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

  isActive(now: Dayjs = dayjs()): boolean {
    try {
      return now.isBetween(
        this.toDatetime(this.startTime),
        this.toDatetime(this.endTime),
        undefined,
        '[)'
      )
    } catch {
      return false
    }
  }

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

  static parseTime(time: Time) {
    const [HH = '00', mm = '00', ss = '00'] = time.split(':')

    return {
      HH,
      mm,
      ss,
    }
  }

  static now() {
    return dayjs().format('HH:mm:ss')
  }
}
