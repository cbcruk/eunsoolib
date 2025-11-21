import { describe, it, expect, beforeEach } from 'vitest'
import { RankManager } from './rank-manager'

describe('RankManager', () => {
  let manager: RankManager

  beforeEach(() => {
    manager = new RankManager()
  })

  it('점수를 추가하면 랭킹에 포함된다', () => {
    manager.add(50, 'B')

    const ranks = manager.getTop10()

    expect(ranks).toHaveLength(1)
    expect(ranks[0].score).toBe(50)
    expect(ranks[0].rank).toBe('B')
    expect(typeof ranks[0].date).toBe('string')
  })

  it('점수가 높은 순으로 정렬된다', () => {
    manager.add(30, 'C')
    manager.add(80, 'S')
    manager.add(60, 'A')

    const scores = manager.getTop10().map((r) => r.score)

    expect(scores).toEqual([80, 60, 30])
  })

  it('최대 10개만 유지한다', () => {
    for (let i = 0; i < 15; i++) {
      manager.add(i * 10, 'A')
    }

    const ranks = manager.getTop10()

    expect(ranks).toHaveLength(10)
    expect(ranks[0].score).toBe(140) // 가장 높은 점수
    expect(ranks[9].score).toBe(50) // 가장 낮은 점수
  })

  it('reset()을 호출하면 모든 랭킹이 제거된다', () => {
    manager.add(100, 'S')
    expect(manager.getTop10()).toHaveLength(1)

    manager.reset()
    expect(manager.getTop10()).toHaveLength(0)
  })
})
