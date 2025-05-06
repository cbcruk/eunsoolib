import { describe, it, expect } from 'vitest'
import { ScoreManager } from './score-manager'

describe('ScoreManager', () => {
  it('점수를 누적할 수 있다', () => {
    const score = new ScoreManager()

    score.add(10)
    score.add(20)

    expect(score.getScore()).toBe(30)
  })

  it('초기 점수를 지정할 수 있다', () => {
    const score = new ScoreManager(50)

    expect(score.getScore()).toBe(50)
  })

  it('점수를 초기화할 수 있다', () => {
    const score = new ScoreManager()

    score.add(40)
    score.resetScore()

    expect(score.getScore()).toBe(0)
  })

  it('점수에 따라 랭크가 다르게 반환된다', () => {
    const score = new ScoreManager()

    score.add(5)
    expect(score.getRankName()).toBe('D')

    score.add(10)
    expect(score.getRankName()).toBe('C')

    score.add(30)
    expect(score.getRankName()).toBe('B')

    score.add(30)
    expect(score.getRankName()).toBe('A')

    score.add(30)
    expect(score.getRankName()).toBe('S')
  })
})
