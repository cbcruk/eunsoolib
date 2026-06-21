import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCss,
  hash,
  scopeFor,
  scopeId,
  transformGlobals,
} from './scope-style'

describe('hash / scopeId', () => {
  it('결정적이며 s 접두사를 가진 id를 만들어야 함', () => {
    expect(hash('abc')).toBe(hash('abc'))
    expect(hash('abc')).toMatch(/^s[0-9a-z]+$/)
  })

  it('CSS가 다르면 다른 id여야 함', () => {
    expect(scopeId('a {}', {})).not.toBe(scopeId('b {}', {}))
  })

  it('옵션이 다르면 다른 id여야 함', () => {
    const css = ':scope {}'
    expect(scopeId(css, { layer: 'a' })).not.toBe(scopeId(css, { layer: 'b' }))
    expect(scopeId(css, { donut: false })).not.toBe(
      scopeId(css, { donut: true }),
    )
  })
})

describe('buildCss', () => {
  const css = ':scope { color: red }'

  it('기본값은 @scope에 donut 경계를 포함해야 함', () => {
    const out = buildCss('s1', css, {})
    expect(out).toContain('@scope ([data-scope="s1"]) to ([data-scope]) {')
    expect(out).toContain(css)
  })

  it('donut:false면 경계가 없어야 함', () => {
    expect(buildCss('s1', css, { donut: false })).toContain(
      '@scope ([data-scope="s1"]) {',
    )
  })

  it('donut 문자열은 커스텀 경계 선택자를 써야 함', () => {
    expect(buildCss('s1', css, { donut: '.content' })).toContain(
      'to (.content) {',
    )
  })

  it('layer를 주면 @layer로 감싸야 함', () => {
    const out = buildCss('s1', css, { layer: 'components' })
    expect(out.startsWith('@layer components {')).toBe(true)
    expect(out).toContain('@scope ([data-scope="s1"])')
  })
})

describe('scopeFor', () => {
  it('props·id·built css를 함께 돌려줘야 함', () => {
    const { props, id, css } = scopeFor(':scope { color: red }', {
      layer: 'components',
    })
    expect(props['data-scope']).toBe(id)
    expect(css).toContain(`[data-scope="${id}"]`)
  })

  it('같은 입력에 대해 안정적인 id를 줘야 함 (SSR/hydration)', () => {
    const a = scopeFor(':scope {}', { donut: true })
    const b = scopeFor(':scope {}', { donut: true })
    expect(a.id).toBe(b.id)
  })
})

describe('transformGlobals — @keyframes 네임스페이싱', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keyframes 선언과 animation 참조를 함께 리네임해야 함', () => {
    const css = `@keyframes spin { to { transform: rotate(360deg) } }
      :scope { animation: spin 1s linear infinite }`
    const out = transformGlobals('s1', css, true)

    expect(out).toContain('@keyframes spin_s1')
    expect(out).toContain('animation: spin_s1 1s linear infinite')
  })

  it('animation 값 안의 키워드/클래스는 건드리지 않아야 함', () => {
    const css = `@keyframes spin {} :scope { animation: spin 1s linear infinite }`
    const out = transformGlobals('s1', css, true)
    expect(out).toContain('linear')
    expect(out).toContain('infinite')
  })

  it('scopeNames:false면 리네임하지 않아야 함', () => {
    const css = `@keyframes spin {} :scope { animation: spin 1s }`
    expect(transformGlobals('s1', css, false)).toBe(css)
  })

  it('keyframes가 없으면 원본을 그대로 반환해야 함', () => {
    const css = ':scope { color: red }'
    expect(transformGlobals('s1', css, true)).toBe(css)
  })

  it('@font-face는 네임스페이싱하지 않고 dev에서 경고해야 함', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const css = `@font-face { font-family: "X"; src: url(x.woff2) }`
    const out = transformGlobals(`fontwarn-${Math.random()}`, css, true)
    expect(out).toBe(css)
    expect(warn).toHaveBeenCalled()
  })
})
