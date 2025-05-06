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

export class ScoreManager {
  private score: number = 0

  constructor(initialScore = 0) {
    this.score = initialScore
  }

  getScore() {
    return this.score
  }

  resetScore() {
    this.score = 0
  }

  add(point: number) {
    this.score += point
  }

  getRank() {
    return (
      RANKS.find((rank) => this.score >= rank.point) ?? RANKS[RANKS.length - 1]
    )
  }

  getRankName() {
    return this.getRank().name
  }
}
