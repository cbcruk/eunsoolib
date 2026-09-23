// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hasJsx } from './has-jsx'

describe('hasJsx', () => {
  it('JSX 엘리먼트가 있으면 true를 반환해야 함', () => {
    expect(hasJsx('export const App = () => <div className="a" />')).toBe(true)
  })

  it('프래그먼트만 써도 true를 반환해야 함', () => {
    expect(hasJsx('export const App = () => <>hello</>')).toBe(true)
  })

  it('JSX가 없으면 false를 반환해야 함', () => {
    expect(hasJsx('export const sum = (a, b) => a + b')).toBe(false)
  })

  it('비교 연산자를 JSX로 착각하지 않아야 함', () => {
    expect(hasJsx('export const isSmall = (a, b) => a < b && b > a')).toBe(
      false,
    )
  })

  it('문자열이나 주석 안의 태그는 세지 않아야 함', () => {
    expect(hasJsx('// <div />\nexport const html = "<div />"')).toBe(false)
  })

  it('셰뱅으로 시작하는 파일도 읽어야 함', () => {
    expect(hasJsx('#!/usr/bin/env node\nconsole.log(1)')).toBe(false)
  })

  it('최신 문법(optional chaining, top-level await)을 읽어야 함', () => {
    expect(hasJsx('const value = await fetch(url)\nconst a = b?.c ?? d')).toBe(
      false,
    )
  })

  it('파싱할 수 없으면 던져야 함', () => {
    expect(() => hasJsx('const a: number = 1')).toThrow()
  })
})
