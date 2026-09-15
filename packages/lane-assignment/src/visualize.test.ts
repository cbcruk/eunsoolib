import { describe, it, expect } from 'vitest'
import { assignLanesWeekly } from './lane-weekly'
import { visualizeWeeklyLanes } from './visualize'

describe('visualizeWeeklyLanes', () => {
  const events = assignLanesWeekly([
    { start: '2025-01-06', end: '2025-01-07', title: '회의' },
    { start: '2025-01-06', end: '2025-01-08', title: '출장' },
  ]).events

  it('showTitle 기본값이면 레인 아래에 이벤트 제목을 표시해야 함', () => {
    const output = visualizeWeeklyLanes(events)

    expect(output).toContain('↳ 회의')
    expect(output).toContain('↳ 출장')
  })

  it('showTitle이 false면 제목을 표시하지 않아야 함', () => {
    const output = visualizeWeeklyLanes(events, 'Sunday', { showTitle: false })

    expect(output).not.toContain('↳')
  })
})
