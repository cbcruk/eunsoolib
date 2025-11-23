import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import type { CalendarEvent } from './types'

dayjs.extend(isSameOrBefore)

/** 레인 정보가 추가된 이벤트 타입 */
export interface EventWithLane extends CalendarEvent {
  /** 0부터 시작하는 레인 번호 (위에서 아래로) */
  lane: number
  /** 이벤트 고유 식별자 */
  eventId: string
}

/** 레인 할당 결과 */
export interface LaneAssignmentResult {
  /** 레인이 할당된 이벤트 목록 */
  events: EventWithLane[]
  /** 필요한 총 레인 개수 */
  totalLanes: number
}

/**
 * 간단한 레인 할당 알고리즘
 *
 * 시간 복잡도: O(n log n + n×m)
 * - 정렬 기반 단순 구현
 * - 이벤트를 시작일 순으로 정렬하고, 첫 번째 사용 가능한 레인에 배치
 *
 * @param events - 레인을 할당할 이벤트 배열
 * @returns 레인이 할당된 이벤트와 메타데이터
 */
export function assignLanesSimple(
  events: CalendarEvent[]
): LaneAssignmentResult {
  if (!events || events.length === 0) {
    return { events: [], totalLanes: 0 }
  }

  // 시작일 기준 정렬 (동일 시작일인 경우 종료일이 빠른 것 우선)
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = dayjs(a.start).valueOf()
    const bStart = dayjs(b.start).valueOf()
    if (aStart !== bStart) return aStart - bStart

    const aEnd = a.end ? dayjs(a.end).valueOf() : aStart
    const bEnd = b.end ? dayjs(b.end).valueOf() : bStart
    return aEnd - bEnd
  })

  // 각 레인의 마지막 이벤트 종료일 추적
  const laneTracks: Array<dayjs.Dayjs | null> = []

  const result: EventWithLane[] = sortedEvents.map((event, index) => {
    const start = dayjs(event.start)
    const end = event.end ? dayjs(event.end) : start

    // 사용 가능한 레인 찾기
    let assignedLane = -1
    for (let i = 0; i < laneTracks.length; i++) {
      if (!laneTracks[i] || laneTracks[i]!.isBefore(start, 'day')) {
        assignedLane = i
        break
      }
    }

    // 사용 가능한 레인이 없으면 새 레인 생성
    if (assignedLane === -1) {
      assignedLane = laneTracks.length
      laneTracks.push(null)
    }

    laneTracks[assignedLane] = end

    return {
      ...event,
      lane: assignedLane,
      eventId: `event-${index}-${start.valueOf()}`,
    }
  })

  return {
    events: result,
    totalLanes: laneTracks.length,
  }
}

/**
 * 날짜별로 이벤트를 그룹화
 * @param eventsWithLanes - 레인이 할당된 이벤트 배열
 * @returns 날짜별 이벤트 맵 (key: YYYY-MM-DD)
 */
export function groupEventsByDate(
  eventsWithLanes: EventWithLane[]
): Map<string, EventWithLane[]> {
  const map = new Map<string, EventWithLane[]>()

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

  // 각 날짜의 이벤트를 레인 순으로 정렬
  map.forEach((events) => {
    events.sort((a, b) => a.lane - b.lane)
  })

  return map
}
