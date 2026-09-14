/** 랭킹에 저장되는 한 건의 기록. */
export type RankEntry = {
  /** 점수. */
  score: number
  /** 랭크 이름. */
  rank: string
  /** 기록 시각(ISO 8601 문자열). */
  date: string
}

/**
 * 점수 상위 10개 기록을 메모리에 보관한다.
 *
 * 영속화하지 않으며 `MoleGameManager`와 연결되어 있지 않으므로 게임 종료 시 직접 기록한다.
 */
export class RankManager {
  private ranks: RankEntry[] = []

  /** 현재 시각으로 기록을 추가하고 점수 내림차순으로 상위 10개만 남긴다. */
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

  /** 점수 내림차순으로 정렬된 기록 목록의 복사본을 반환한다. */
  getTop10(): RankEntry[] {
    return [...this.ranks]
  }

  /** 모든 기록을 지운다. */
  reset() {
    this.ranks = []
  }
}
