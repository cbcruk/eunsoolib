import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScopedStyle, ScopedStyle } from './use-scoped-style'
import { scopeFor } from './scope-style'

const CSS = ':scope { color: red } p { color: crimson }'

function Box({ css = CSS }: { css?: string }) {
  const scope = useScopedStyle(css)
  return <div {...scope} data-testid="box" />
}

function sheets(id: string): NodeListOf<HTMLStyleElement> {
  return document.querySelectorAll<HTMLStyleElement>(
    `style[data-scope-sheet="${id}"]`,
  )
}

describe('useScopedStyle', () => {
  it('<head>에 style을 주입하고 root에 data-scope를 부여해야 함', () => {
    const id = scopeFor(CSS).id
    const { getByTestId } = render(<Box />)

    expect(getByTestId('box').getAttribute('data-scope')).toBe(id)
    expect(sheets(id)).toHaveLength(1)
    expect(sheets(id)[0].textContent).toContain('@scope ([data-scope=')
  })

  it('인스턴스 간 style을 공유(ref-count)하고 마지막 언마운트 때 제거해야 함', () => {
    const id = scopeFor(CSS).id
    const a = render(<Box />)
    const b = render(<Box />)
    expect(sheets(id)).toHaveLength(1)

    a.unmount()
    expect(sheets(id)).toHaveLength(1)

    b.unmount()
    expect(sheets(id)).toHaveLength(0)
  })
})

describe('ScopedStyle', () => {
  it('built css를 담은 style 리소스를 렌더해야 함', () => {
    const { id } = scopeFor(CSS, { layer: 'components' })
    render(<ScopedStyle css={CSS} layer="components" />)

    const style = Array.from(
      document.querySelectorAll<HTMLStyleElement>('style'),
    ).find((s) => s.textContent?.includes(`[data-scope="${id}"]`))
    expect(style).toBeDefined()
    expect(style!.textContent).toContain('@layer components')
  })
})
