import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import type { EventWithLane } from './lane-simple'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
import type { EventWithWeeklyLane } from './lane-weekly'
import { getLaneForDate, type WeekStartsOn } from './lane-weekly'

/**
 * 레인 할당 결과를 ASCII로 시각화
 * @example
 * ```
 *          03/05  03/06  03/07  03/08  03/09  03/10
 * Lane 0:  [====== Event A ======]
 * Lane 1:                [======== Event B ========]
 *
 * Total lanes: 2
 * ```
 */
export function visualizeLanes(
  events: EventWithLane[],
  options: { showTitle?: boolean } = {}
): string {
  const { showTitle = true } = options

  if (events.length === 0) {
    return '(no events)'
  }

  // 전체 날짜 범위 계산
  let minDate = dayjs(events[0].start)
  let maxDate = dayjs(events[0].end || events[0].start)

  events.forEach((event) => {
    const start = dayjs(event.start)
    const end = dayjs(event.end || event.start)
    if (start.isBefore(minDate)) minDate = start
    if (end.isAfter(maxDate)) maxDate = end
  })

  // 날짜 배열 생성
  const dates: dayjs.Dayjs[] = []
  let current = minDate
  while (current.isSameOrBefore(maxDate, 'day')) {
    dates.push(current)
    current = current.add(1, 'day')
  }

  // 레인별 이벤트 그룹화
  const maxLane = Math.max(...events.map((e) => e.lane))
  const lanes: EventWithLane[][] = Array.from({ length: maxLane + 1 }, () => [])
  events.forEach((event) => {
    lanes[event.lane].push(event)
  })

  const cellWidth = 7
  const lines: string[] = []

  // 헤더 (날짜)
  const header =
    '         ' +
    dates.map((d) => d.format('MM/DD').padStart(cellWidth)).join('')
  lines.push(header)

  // 각 레인 출력
  lanes.forEach((laneEvents, laneIndex) => {
    let line = `Lane ${laneIndex}:`.padEnd(9)

    dates.forEach((date) => {
      const event = laneEvents.find((e) => {
        const start = dayjs(e.start)
        const end = dayjs(e.end || e.start)
        return (
          date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day')
        )
      })

      if (event) {
        const start = dayjs(event.start)
        const end = dayjs(event.end || event.start)
        const isStart = date.isSame(start, 'day')
        const isEnd = date.isSame(end, 'day')

        if (isStart && isEnd) {
          // 단일 날짜 이벤트
          line += '[==]'.padStart(cellWidth)
        } else if (isStart) {
          line += '[==='.padStart(cellWidth)
        } else if (isEnd) {
          line += '===]'.padStart(cellWidth)
        } else {
          line += '===='.padStart(cellWidth)
        }
      } else {
        line += ''.padStart(cellWidth)
      }
    })

    lines.push(line)

    // 이벤트 제목 표시
    if (showTitle) {
      laneEvents.forEach((event) => {
        const title = event.title || `Event ${event.eventId.slice(-4)}`
        const start = dayjs(event.start)
        const startIdx = dates.findIndex((d) => d.isSame(start, 'day'))
        const padding = 9 + startIdx * cellWidth
        lines.push(''.padStart(padding) + `↳ ${title}`)
      })
    }
  })

  lines.push('')
  lines.push(`Total lanes: ${maxLane + 1}`)

  return lines.join('\n')
}

/**
 * 주별 레인 할당 결과를 ASCII로 시각화
 */
export function visualizeWeeklyLanes(
  events: EventWithWeeklyLane[],
  weekStartsOn: WeekStartsOn = 'Sunday',
  options: { showTitle?: boolean } = {}
): string {
  const { showTitle = true } = options

  if (events.length === 0) {
    return '(no events)'
  }

  // 전체 날짜 범위 계산
  let minDate = dayjs(events[0].start)
  let maxDate = dayjs(events[0].end || events[0].start)

  events.forEach((event) => {
    const start = dayjs(event.start)
    const end = dayjs(event.end || event.start)
    if (start.isBefore(minDate)) minDate = start
    if (end.isAfter(maxDate)) maxDate = end
  })

  // 날짜 배열 생성
  const dates: dayjs.Dayjs[] = []
  let current = minDate
  while (current.isSameOrBefore(maxDate, 'day')) {
    dates.push(current)
    current = current.add(1, 'day')
  }

  // 각 날짜별 최대 레인 수 계산
  const maxLaneByDate = new Map<string, number>()
  dates.forEach((date) => {
    let maxLane = 0
    events.forEach((event) => {
      const start = dayjs(event.start)
      const end = dayjs(event.end || event.start)
      if (date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day')) {
        const lane = getLaneForDate(event, date, weekStartsOn)
        if (lane > maxLane) maxLane = lane
      }
    })
    maxLaneByDate.set(date.format('YYYY-MM-DD'), maxLane)
  })

  const overallMaxLane = Math.max(...Array.from(maxLaneByDate.values()))

  const cellWidth = 7
  const lines: string[] = []

  // 헤더 (날짜)
  const header =
    '         ' +
    dates.map((d) => d.format('MM/DD').padStart(cellWidth)).join('')
  lines.push(header)

  // 각 레인 출력
  for (let laneIndex = 0; laneIndex <= overallMaxLane; laneIndex++) {
    let line = `Lane ${laneIndex}:`.padEnd(9)

    dates.forEach((date) => {
      const event = events.find((e) => {
        const start = dayjs(e.start)
        const end = dayjs(e.end || e.start)
        const isInRange =
          date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day')
        const lane = getLaneForDate(e, date, weekStartsOn)
        return isInRange && lane === laneIndex
      })

      if (event) {
        const start = dayjs(event.start)
        const end = dayjs(event.end || event.start)
        const isStart = date.isSame(start, 'day')
        const isEnd = date.isSame(end, 'day')

        if (isStart && isEnd) {
          line += '[==]'.padStart(cellWidth)
        } else if (isStart) {
          line += '[==='.padStart(cellWidth)
        } else if (isEnd) {
          line += '===]'.padStart(cellWidth)
        } else {
          line += '===='.padStart(cellWidth)
        }
      } else {
        line += ''.padStart(cellWidth)
      }
    })

    lines.push(line)
  }

  lines.push('')
  lines.push(`Total lanes: ${overallMaxLane + 1}`)

  return lines.join('\n')
}
