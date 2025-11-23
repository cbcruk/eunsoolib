import { describe, it, expect } from 'vitest'
import { assignLanesSimple, groupEventsByDate } from './lane-simple'
import { visualizeLanes } from './visualize'
import type { CalendarEvent } from './types'

describe('assignLanesSimple', () => {
  it('빈 배열을 처리', () => {
    const result = assignLanesSimple([])

    expect(result.events).toEqual([])
    expect(result.totalLanes).toBe(0)
  })

  it('겹치지 않는 이벤트는 같은 레인에 배치', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-07' },
      { start: '2022-03-10', end: '2022-03-12' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(1)
    expect(result.events[0].lane).toBe(0)
    expect(result.events[1].lane).toBe(0)
  })

  it('겹치는 이벤트는 다른 레인에 배치', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-08', end: '2022-03-15' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(2)
    expect(result.events[0].lane).toBe(0)
    expect(result.events[1].lane).toBe(1)
  })

  it('세 개의 겹치는 이벤트를 처리', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10', title: 'Event A' },
      { start: '2022-03-08', end: '2022-03-15', title: 'Event B' },
      { start: '2022-03-09', end: '2022-03-12', title: 'Event C' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(3)
  })

  it('종료일 이후에 시작하는 이벤트는 레인 재사용', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-11', end: '2022-03-15' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(1)
  })

  it('같은 날 종료/시작하는 이벤트는 다른 레인 (겹침 판정)', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-10', end: '2022-03-15' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(2)
  })

  it('단일 날짜 이벤트 처리', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05' },
      { start: '2022-03-05' },
    ]

    const result = assignLanesSimple(events)

    expect(result.totalLanes).toBe(2)
  })

  it('eventId가 생성됨', () => {
    const events: CalendarEvent[] = [{ start: '2022-03-05', end: '2022-03-10' }]

    const result = assignLanesSimple(events)

    expect(result.events[0].eventId).toMatch(/^event-\d+-\d+$/)
  })

  it('시작일 기준으로 정렬하여 처리', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-10', end: '2022-03-15', title: 'Later' },
      { start: '2022-03-05', end: '2022-03-08', title: 'Earlier' },
    ]

    const result = assignLanesSimple(events)

    // 정렬되어 Earlier가 먼저 처리되어 Lane 0에 배치
    const earlier = result.events.find((e) => e.title === 'Earlier')
    const later = result.events.find((e) => e.title === 'Later')

    expect(earlier?.lane).toBe(0)
    expect(later?.lane).toBe(0) // 겹치지 않으므로 같은 레인
  })
})

describe('groupEventsByDate', () => {
  it('날짜별로 이벤트를 그룹화', () => {
    const events = assignLanesSimple([
      { start: '2022-03-05', end: '2022-03-07' },
    ]).events

    const grouped = groupEventsByDate(events)

    expect(grouped.has('2022-03-05')).toBe(true)
    expect(grouped.has('2022-03-06')).toBe(true)
    expect(grouped.has('2022-03-07')).toBe(true)
    expect(grouped.get('2022-03-05')?.length).toBe(1)
  })

  it('같은 날짜에 여러 이벤트가 있으면 레인 순으로 정렬', () => {
    const events = assignLanesSimple([
      { start: '2022-03-05', end: '2022-03-10' },
      { start: '2022-03-05', end: '2022-03-08' },
    ]).events

    const grouped = groupEventsByDate(events)
    const march5 = grouped.get('2022-03-05')!

    expect(march5[0].lane).toBeLessThanOrEqual(march5[1].lane)
  })
})

describe('visualizeLanes', () => {
  it('겹치지 않는 이벤트 시각화', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-07', title: 'Event A' },
      { start: '2022-03-10', end: '2022-03-12', title: 'Event B' },
    ]

    const result = assignLanesSimple(events)
    const visualization = visualizeLanes(result.events)

    expect(visualization).toMatchInlineSnapshot(`
      "           03/05  03/06  03/07  03/08  03/09  03/10  03/11  03/12
      Lane 0:     [===   ====   ===]                 [===   ====   ===]
               ↳ Event A
                                                  ↳ Event B

      Total lanes: 1"
    `)
  })

  it('겹치는 이벤트 시각화', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-10', title: 'Event A' },
      { start: '2022-03-08', end: '2022-03-15', title: 'Event B' },
      { start: '2022-03-09', end: '2022-03-12', title: 'Event C' },
    ]

    const result = assignLanesSimple(events)
    const visualization = visualizeLanes(result.events)

    expect(visualization).toMatchInlineSnapshot(`
      "           03/05  03/06  03/07  03/08  03/09  03/10  03/11  03/12  03/13  03/14  03/15
      Lane 0:     [===   ====   ====   ====   ====   ===]                                   
               ↳ Event A
      Lane 1:                          [===   ====   ====   ====   ====   ====   ====   ===]
                                    ↳ Event B
      Lane 2:                                 [===   ====   ====   ===]                     
                                           ↳ Event C

      Total lanes: 3"
    `)
  })

  it('레인 재사용 시각화', () => {
    const events: CalendarEvent[] = [
      { start: '2022-03-05', end: '2022-03-07', title: 'Event A' },
      { start: '2022-03-08', end: '2022-03-10', title: 'Event B' },
    ]

    const result = assignLanesSimple(events)
    const visualization = visualizeLanes(result.events)

    expect(visualization).toMatchInlineSnapshot(`
      "           03/05  03/06  03/07  03/08  03/09  03/10
      Lane 0:     [===   ====   ===]   [===   ====   ===]
               ↳ Event A
                                    ↳ Event B

      Total lanes: 1"
    `)
  })
})
