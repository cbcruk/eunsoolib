import type { BoardConfig, Difficulty } from './minesweeper.types'

/** 난이도별 보드 크기와 지뢰 수 (윈도우 지뢰찾기 기준) */
export const DIFFICULTY_CONFIGS: Record<Difficulty, BoardConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
}
