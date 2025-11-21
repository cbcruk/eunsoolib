import { describe, it, expect } from 'vitest'
import { GameConfig } from './game-config'

describe('GameConfig', () => {
  it('유효한 설정값으로 생성할 수 있다', () => {
    const config = new GameConfig(3, 4, 5)

    expect(config.row).toBe(3)
    expect(config.col).toBe(4)
    expect(config.moleCount).toBe(5)
    expect(config.totalSlots).toBe(12)
  })

  it('clone은 동일한 값을 가지는 새로운 인스턴스를 반환한다', () => {
    const config = new GameConfig(3, 4, 5)
    const cloned = config.clone()

    expect(cloned).not.toBe(config)
    expect(cloned.row).toBe(config.row)
    expect(cloned.col).toBe(config.col)
    expect(cloned.moleCount).toBe(config.moleCount)
  })

  it('행 또는 열이 유효 범위를 벗어나면 예외를 던진다', () => {
    expect(() => new GameConfig(1, 3, 1)).toThrow()
    expect(() => new GameConfig(7, 3, 1)).toThrow()
    expect(() => new GameConfig(3, 7, 1)).toThrow()
  })

  it('두더지 개수가 1 미만이거나 절반 이상이면 예외를 던진다', () => {
    expect(() => new GameConfig(3, 3, 0)).toThrow()
    expect(() => new GameConfig(3, 3, 5)).toThrow()
  })

  it('isValidSize()는 행과 열이 유효한 경우에만 true를 반환한다', () => {
    expect(GameConfig.isValidSize(2, 2)).toBe(true)
    expect(GameConfig.isValidSize(6, 6)).toBe(true)
    expect(GameConfig.isValidSize(1, 3)).toBe(false)
    expect(GameConfig.isValidSize(3, 7)).toBe(false)
  })
})
