import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import {
  assignLanesWeekly,
  getLaneForDate,
  groupEventsByDateWeekly,
} from './lane-weekly'
import type { CalendarEvent } from './types'

describe('assignLanesWeekly', () => {
  it('빈 배열을 처리', () => {
    const result = assignLanesWeekly([])

    expect(result.events).toEqual([])
    expect(result.weekLaneCounts.size).toBe(0)
  })

  it('단일 이벤트에 주별 레인 할당', () => {
    const events: CalendarEvent[] = [{ start: '2022-03-05', end: '2022-03-07' }]

    const result = assignLanesWeekly(events)

    expect(result.events.length).toBe(1)
    expect(result.events[0].weeklyLanes.size).toBeGreaterThan(0)
  })

  it('여러 주에 걸친 이벤트는 각 주별로 레인 할당', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-20', end: '2022-04-03' }, // 여러 주에 걸침
    ]

    const result = assignLanesWeekly(events, 'Sunday')

    expect(result.events[0].weeklyLanes.size).toBeGreaterThan(1)
  })

  it('같은 주 내에서 겹치는 이벤트는 다른 레인에 배치', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-07', end: '2022-03-12' },
    ]

    const result = assignLanesWeekly(events)
    const weekKey = Array.from(result.events[0].weeklyLanes.keys())[0]

    const lane0 = result.events[0].weeklyLanes.get(weekKey)
    const lane1 = result.events[1].weeklyLanes.get(weekKey)

    expect(lane0).not.toBe(lane1)
  })

  it('eventId가 생성됨', () => {
    const events: CalendarEvent[] = [{ start: '2022-03-05' }]

    const result = assignLanesWeekly(events)

    expect(result.events[0].eventId).toMatch(/^event-\d+-\d+$/)
  })

  it('weekLaneCounts에 각 주의 레인 개수 저장', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-07', end: '2022-03-12' },
    ]

    const result = assignLanesWeekly(events)

    expect(result.weekLaneCounts.size).toBeGreaterThan(0)
    result.weekLaneCounts.forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('getLaneForDate', () => {
  it('특정 날짜의 주에서 레인 번호를 반환', () => {
    const events: CalendarEvent[] = [{ start: '2022-03-05', end: '2022-03-10' }]
    const result = assignLanesWeekly(events)
    const event = result.events[0]

    const lane = getLaneForDate(event, dayjs('2022-03-07'))

    expect(typeof lane).toBe('number')
  })

  it('이벤트가 없는 주는 기본값 0 반환', () => {
    const events: CalendarEvent[] = [{ start: '2022-03-05', end: '2022-03-07' }]
    const result = assignLanesWeekly(events)
    const event = result.events[0]

    const lane = getLaneForDate(event, dayjs('2022-06-01')) // 다른 주

    expect(lane).toBe(0)
  })
})

describe('groupEventsByDateWeekly', () => {
  it('날짜별로 이벤트를 그룹화', () => {
    const events = assignLanesWeekly([
      { start: '2022-03-05', end: '2022-03-07' },
    ]).events

    const grouped = groupEventsByDateWeekly(events)

    expect(grouped.has('2022-03-05')).toBe(true)
    expect(grouped.has('2022-03-06')).toBe(true)
    expect(grouped.has('2022-03-07')).toBe(true)
  })

  it('같은 날짜의 이벤트를 레인 순으로 정렬', () => {
    const events = assignLanesWeekly([
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-05', end: '2022-03-08' },
    ]).events

    const grouped = groupEventsByDateWeekly(events)
    const march5 = grouped.get('2022-03-05')!

    const lane0 = getLaneForDate(march5[0], dayjs('2022-03-05'))
    const lane1 = getLaneForDate(march5[1], dayjs('2022-03-05'))

    expect(lane0).toBeLessThanOrEqual(lane1)
  })
})

describe('주 경계 계산', () => {
  it('월요일 시작 주로도 예외 없이 레인을 할당해야 함', () => {
    const result = assignLanesWeekly(
      [
        { start: '2025-01-06', end: '2025-01-08' },
        { start: '2025-01-07', end: '2025-01-09' },
      ],
      'Monday',
    )

    expect(Array.from(result.weekLaneCounts)).toEqual([['2025-W02', 2]])
  })

  it('월요일 시작 주는 연도가 바뀌어도 ISO 주차 하나로 묶여야 함', () => {
    const result = assignLanesWeekly(
      [{ start: '2024-12-30', end: '2025-01-05' }],
      'Monday',
    )

    expect(Array.from(result.events[0].weeklyLanes.keys())).toEqual([
      '2025-W01',
    ])
  })

  it('일요일 시작 주는 일요일부터 새 주로 나뉘어야 함', () => {
    // 2022-03-05는 토요일, 2022-03-06은 일요일
    const result = assignLanesWeekly(
      [{ start: '2022-03-05', end: '2022-03-07' }],
      'Sunday',
    )

    expect(Array.from(result.events[0].weeklyLanes.keys())).toEqual([
      '2022-W09',
      '2022-W10',
    ])
  })

  it('일요일 시작 주가 연도를 넘으면 하나의 키로 묶여야 함', () => {
    // 2024-12-29(일) ~ 2025-01-04(토)는 같은 주
    const result = assignLanesWeekly(
      [{ start: '2024-12-29', end: '2025-01-04' }],
      'Sunday',
    )

    expect(Array.from(result.events[0].weeklyLanes.keys())).toEqual([
      '2025-W01',
    ])
  })

  it('다른 주에 있는 이벤트는 각자 0번 레인을 받아야 함', () => {
    const result = assignLanesWeekly(
      [
        { start: '2022-03-05', end: '2022-03-05' },
        { start: '2022-03-06', end: '2022-03-06' },
      ],
      'Sunday',
    )

    expect(Array.from(result.weekLaneCounts)).toEqual([
      ['2022-W09', 1],
      ['2022-W10', 1],
    ])
  })

  it('getLaneForDate가 할당 때와 같은 주 키를 써야 함', () => {
    const result = assignLanesWeekly(
      [
        { start: '2025-01-06', end: '2025-01-08' },
        { start: '2025-01-07', end: '2025-01-09' },
      ],
      'Monday',
    )

    expect(
      getLaneForDate(result.events[1], dayjs('2025-01-09'), 'Monday'),
    ).toBe(1)
  })
})
