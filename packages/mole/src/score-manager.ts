type Rank = {
  name: 'S' | 'A' | 'B' | 'C' | 'D'
  point: 100 | 70 | 40 | 10 | 0
}

const RANKS = [
  { name: 'S', point: 100 },
  { name: 'A', point: 70 },
  { name: 'B', point: 40 },
  { name: 'C', point: 10 },
  { name: 'D', point: 0 },
] satisfies Rank[]

/**
 * 점수를 누적하고 점수에 맞는 랭크를 계산한다.
 *
 * 랭크 기준은 `S` ≥ 100, `A` ≥ 70, `B` ≥ 40, `C` ≥ 10, 그 외 `D`다.
 */
export class ScoreManager {
  private score: number = 0

  /** @param initialScore - 시작 점수 */
  constructor(initialScore = 0) {
    this.score = initialScore
  }

  /** 현재 점수를 반환한다. */
  getScore() {
    return this.score
  }

  /** 점수를 `0`으로 되돌린다. */
  resetScore() {
    this.score = 0
  }

  /** 현재 점수에 `point`를 더한다. */
  add(point: number) {
    this.score += point
  }

  /**
   * 현재 점수에 해당하는 랭크를 반환한다.
   *
   * @returns 기준 점수 이상인 첫 랭크의 `{ name, point }`. 해당하는 랭크가 없으면 `D`
   */
  getRank() {
    return (
      RANKS.find((rank) => this.score >= rank.point) ?? RANKS[RANKS.length - 1]
    )
  }

  /** 현재 점수에 해당하는 랭크 이름(`'S'` ~ `'D'`)을 반환한다. */
  getRankName() {
    return this.getRank().name
  }
}
