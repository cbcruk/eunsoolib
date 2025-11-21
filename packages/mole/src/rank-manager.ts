export type RankEntry = {
  score: number
  rank: string
  date: string
}

export class RankManager {
  private ranks: RankEntry[] = []

  add(score: number, rank: string) {
    const entry: RankEntry = {
      score,
      rank,
      date: new Date().toISOString(),
    }

    this.ranks.push(entry)
    this.ranks.sort((a, b) => b.score - a.score)
    this.ranks = this.ranks.slice(0, 10)
  }

  getTop10(): RankEntry[] {
    return [...this.ranks]
  }

  reset() {
    this.ranks = []
  }
}
