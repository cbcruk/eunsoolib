import { describe, expect, it } from 'vitest'
import {
  countRegressions,
  formatReport,
  isRegression,
  sortFindings,
} from './report'
import type { AuditResult, Finding } from './box-sizing-audit.types'

describe('isRegression', () => {
  it('OVERFLOW_INTRODUCED와 INTERNAL_SHIFT만 회귀로 봐야 함', () => {
    expect(isRegression({ kind: 'OVERFLOW_INTRODUCED', sel: 'a' })).toBe(true)
    expect(isRegression({ kind: 'INTERNAL_SHIFT', sel: 'a' })).toBe(true)
    expect(isRegression({ kind: 'REFLOWED', sel: 'a' })).toBe(false)
    expect(isRegression({ kind: 'OVERFLOW_RESOLVED', sel: 'a' })).toBe(false)
  })
})

describe('sortFindings', () => {
  it('심각도 순으로 정렬하고 같은 종류는 ratio 내림차순이어야 함', () => {
    const findings: Finding[] = [
      { kind: 'OVERFLOW_RESOLVED', sel: 'd' },
      { kind: 'INTERNAL_SHIFT', sel: 'b', ratio: 3 },
      { kind: 'OVERFLOW_INTRODUCED', sel: 'a' },
      { kind: 'INTERNAL_SHIFT', sel: 'c', ratio: 9 },
    ]
    expect(sortFindings(findings).map((f) => f.sel)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ])
  })

  it('원본 배열을 변형하지 않아야 함', () => {
    const findings: Finding[] = [
      { kind: 'RESIZED', sel: 'a' },
      { kind: 'OVERFLOW_INTRODUCED', sel: 'b' },
    ]
    sortFindings(findings)
    expect(findings[0].sel).toBe('a')
  })
})

describe('countRegressions', () => {
  it('회귀 종류의 개수만 세어야 함', () => {
    expect(
      countRegressions([
        { kind: 'OVERFLOW_INTRODUCED', sel: 'a' },
        { kind: 'INTERNAL_SHIFT', sel: 'b' },
        { kind: 'REFLOWED', sel: 'c' },
      ]),
    ).toBe(2)
  })
})

describe('formatReport', () => {
  const base: AuditResult = {
    url: 'http://x',
    scope: '*',
    findings: [],
    regressions: 0,
  }

  it('변화가 없으면 안전 메시지를 출력해야 함', () => {
    const text = formatReport(base)
    expect(text).toContain('No layout changes')
  })

  it('finding이 있으면 라벨과 회귀 개수를 포함해야 함', () => {
    const text = formatReport({
      ...base,
      findings: [
        { kind: 'OVERFLOW_INTRODUCED', sel: 'div.card', dw: 0, dh: 0 },
        { kind: 'REFLOWED', sel: 'nav', dx: 4, dy: 0 },
      ],
      regressions: 1,
    })
    expect(text).toContain('Overflow introduced')
    expect(text).toContain('div.card')
    expect(text).toContain('1 likely regression(s).')
  })
})
