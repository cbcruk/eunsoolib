import { formatCount as formatCountFromUtils } from '@cbcruk/utils'
import { describe, expect, it } from 'vitest'
import { formatCount } from './index'

describe('formatCount (deprecated 재내보내기)', () => {
  it('@cbcruk/utils의 formatCount와 같은 함수여야 함', () => {
    expect(formatCount).toBe(formatCountFromUtils)
  })

  it('반올림 결과가 1000K에 닿으면 M으로 올려야 함', () => {
    expect(formatCount(1500)).toBe('1.5K')
    expect(formatCount(999999)).toBe('1.0M')
  })
})
