import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import minMax from 'dayjs/plugin/minMax'
import type { CalendarEvent } from './types'

dayjs.extend(isoWeek)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(minMax)

/** 주별 레인 정보가 추가된 이벤트 타입 */
export interface EventWithWeeklyLane extends CalendarEvent {
  /** 주별 레인 맵 (key: YYYY-Ww, value: 해당 주에서의 레인 번호) */
  weeklyLanes: Map<string, number>
  /** 이벤트 고유 식별자 */
  eventId: string
}

/** 주별 레인 할당 결과 */
export interface WeeklyLaneAssignmentResult {
  /** 주별 레인이 할당된 이벤트 */
  events: EventWithWeeklyLane[]
  /** 각 주의 총 레인 개수 */
  weekLaneCounts: Map<string, number>
}

/** 주 시작 요일 */
export type WeekStartsOn = 'Monday' | 'Sunday'

/** 주 식별자 생성 (YYYY-Ww 형식) */
function getWeekKey(date: dayjs.Dayjs, weekStartsOn: WeekStartsOn): string {
  if (weekStartsOn === 'Monday') {
    return `${date.isoWeekYear()}-W${String(date.isoWeek()).padStart(2, '0')}`
  } else {
    const year = date.year()
    const week = date.isoWeek()
    return `${year}-W${String(week).padStart(2, '0')}`
  }
}

/** 주의 시작일과 종료일 계산 */
function getWeekRange(
  weekKey: string,
  weekStartsOn: WeekStartsOn
): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)

  if (weekStartsOn === 'Monday') {
    const start = dayjs().isoWeekYear(year).isoWeek(week).startOf('isoWeek')
    const end = start.endOf('isoWeek')
    return { start, end }
  } else {
    const start = dayjs().year(year).isoWeek(week).startOf('week')
    const end = start.endOf('week')
    return { start, end }
  }
}

/**
 * 주별 레인 할당 알고리즘
 *
 * 각 주마다 독립적으로 레인을 할당하여 공간 활용을 최적화합니다.
 * 같은 이벤트라도 주가 바뀌면 레인 번호가 달라질 수 있습니다.
 *
 * 시간 복잡도: O(w × n × m)
 * - w: 총 주 개수
 * - n: 각 주의 평균 이벤트 개수
 * - m: 평균 레인 개수
 *
 * @param events - 레인을 할당할 이벤트 배열
 * @param weekStartsOn - 주 시작일 (Monday 또는 Sunday)
 * @returns 주별 레인이 할당된 이벤트와 메타데이터
 */
export function assignLanesWeekly(
  events: CalendarEvent[],
  weekStartsOn: WeekStartsOn = 'Sunday'
): WeeklyLaneAssignmentResult {
  if (!events || events.length === 0) {
    return { events: [], weekLaneCounts: new Map() }
  }

  // 모든 주 식별자 수집
  const allWeeks = new Set<string>()
  events.forEach((event) => {
    const start = dayjs(event.start)
    const end = event.end ? dayjs(event.end) : start

    let current = start
    while (current.isSameOrBefore(end, 'day')) {
      allWeeks.add(getWeekKey(current, weekStartsOn))
      current = current.add(1, 'week').startOf('week')
    }
  })

  const weekLaneCounts = new Map<string, number>()
  const eventLaneMaps = new Map<CalendarEvent, Map<string, number>>()

  events.forEach((event) => {
    eventLaneMaps.set(event, new Map<string, number>())
  })

  // 각 주를 순회하며 레인 할당
  Array.from(allWeeks)
    .sort()
    .forEach((weekKey) => {
      const weekRange = getWeekRange(weekKey, weekStartsOn)

      // 해당 주에 걸쳐있는 이벤트 필터링
      const weekEvents = events.filter((event) => {
        const eventStart = dayjs(event.start)
        const eventEnd = event.end ? dayjs(event.end) : eventStart

        return (
          eventStart.isSameOrBefore(weekRange.end, 'day') &&
          eventEnd.isSameOrAfter(weekRange.start, 'day')
        )
      })

      // 주 내에서 이벤트 정렬
      const sortedWeekEvents = [...weekEvents].sort((a, b) => {
        const aStart = dayjs.max(dayjs(a.start), weekRange.start)!
        const bStart = dayjs.max(dayjs(b.start), weekRange.start)!

        if (!aStart.isSame(bStart, 'day')) {
          return aStart.valueOf() - bStart.valueOf()
        }

        const aEnd = a.end
          ? dayjs.min(dayjs(a.end), weekRange.end)!
          : aStart
        const bEnd = b.end
          ? dayjs.min(dayjs(b.end), weekRange.end)!
          : bStart

        return aEnd.valueOf() - bEnd.valueOf()
      })

      // 간격 스케줄링 알고리즘으로 레인 할당
      const laneTracks: Array<dayjs.Dayjs | null> = []

      sortedWeekEvents.forEach((event) => {
        const eventStart = dayjs(event.start)
        const eventEnd = event.end ? dayjs(event.end) : eventStart

        const weekStart = dayjs.max(eventStart, weekRange.start)!
        const weekEnd = dayjs.min(eventEnd, weekRange.end)!

        let assignedLane = -1
        for (let i = 0; i < laneTracks.length; i++) {
          if (!laneTracks[i] || laneTracks[i]!.isBefore(weekStart, 'day')) {
            assignedLane = i
            break
          }
        }

        if (assignedLane === -1) {
          assignedLane = laneTracks.length
          laneTracks.push(null)
        }

        laneTracks[assignedLane] = weekEnd
        eventLaneMaps.get(event)!.set(weekKey, assignedLane)
      })

      weekLaneCounts.set(weekKey, laneTracks.length)
    })

  const result: EventWithWeeklyLane[] = events.map((event, index) => ({
    ...event,
    weeklyLanes: eventLaneMaps.get(event)!,
    eventId: `event-${index}-${dayjs(event.start).valueOf()}`,
  }))

  return {
    events: result,
    weekLaneCounts,
  }
}

/**
 * 특정 날짜의 주에서 이벤트 레인 번호 조회
 * @param event - 조회할 이벤트
 * @param date - 날짜
 * @param weekStartsOn - 주 시작일
 * @returns 해당 날짜의 주에서의 레인 번호 (없으면 0)
 */
export function getLaneForDate(
  event: EventWithWeeklyLane,
  date: dayjs.Dayjs,
  weekStartsOn: WeekStartsOn = 'Sunday'
): number {
  const weekKey = getWeekKey(date, weekStartsOn)
  return event.weeklyLanes.get(weekKey) ?? 0
}

/**
 * 날짜별로 이벤트를 그룹화 (주별 레인 정보 포함)
 * @param eventsWithLanes - 주별 레인이 할당된 이벤트 배열
 * @param weekStartsOn - 주 시작일
 * @returns 날짜별 이벤트 맵
 */
export function groupEventsByDateWeekly(
  eventsWithLanes: EventWithWeeklyLane[],
  weekStartsOn: WeekStartsOn = 'Sunday'
): Map<string, EventWithWeeklyLane[]> {
  const map = new Map<string, EventWithWeeklyLane[]>()

  eventsWithLanes.forEach((event) => {
    const start = dayjs(event.start)
    const end = event.end ? dayjs(event.end) : start

    let current = start
    while (current.isSameOrBefore(end, 'day')) {
      const key = current.format('YYYY-MM-DD')
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(event)
      current = current.add(1, 'day')
    }
  })

  // 각 날짜의 이벤트를 해당 날짜의 주에서의 레인 순으로 정렬
  map.forEach((events, dateKey) => {
    const date = dayjs(dateKey)
    events.sort((a, b) => {
      const laneA = getLaneForDate(a, date, weekStartsOn)
      const laneB = getLaneForDate(b, date, weekStartsOn)
      return laneA - laneB
    })
  })

  return map
}
