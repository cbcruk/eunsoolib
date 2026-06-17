import { describe, expect, it } from 'vitest'
import { buildFlipCss, parseArgs } from './cli'

describe('parseArgs', () => {
  it('URL과 플래그를 파싱해야 함', () => {
    const args = parseArgs([
      'http://localhost:3000/admin',
      '--scope',
      'main',
      '--viewport',
      '375x667',
      '--json',
    ])
    expect(args.url).toBe('http://localhost:3000/admin')
    expect(args.scope).toBe('main')
    expect(args.viewport).toEqual({ width: 375, height: 667 })
    expect(args.json).toBe(true)
  })

  it('플래그가 없으면 기본값을 사용해야 함', () => {
    const args = parseArgs(['https://example.com'])
    expect(args.scope).toBeNull()
    expect(args.viewport).toEqual({ width: 1280, height: 800 })
    expect(args.json).toBe(false)
  })

  it('URL이 없으면 null이어야 함', () => {
    expect(parseArgs(['--json']).url).toBeNull()
  })

  it('--scope 뒤에 다른 플래그가 오면 값으로 취하지 않아야 함', () => {
    expect(parseArgs(['http://x', '--scope', '--json']).scope).toBeNull()
  })

  it('잘못된 viewport는 기본값으로 대체해야 함', () => {
    expect(parseArgs(['http://x', '--viewport', 'wat']).viewport).toEqual({
      width: 1280,
      height: 800,
    })
  })
})

describe('buildFlipCss', () => {
  it('scope가 없으면 전체 페이지를 대상으로 해야 함', () => {
    expect(buildFlipCss(null)).toBe(
      '*, *::before, *::after { box-sizing: border-box !important }',
    )
  })

  it('scope가 있으면 해당 서브트리만 대상으로 해야 함', () => {
    expect(buildFlipCss('main')).toBe(
      'main, main *, main *::before, main *::after { box-sizing: border-box !important }',
    )
  })
})
