import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { Highlight } from './react'

describe('<Highlight> (SSR)', () => {
  test('기본적으로 children을 div wrapper로 감싸야 함', () => {
    const html = renderToStaticMarkup(
      <Highlight query="cat" name="search">
        <p>the cat sat</p>
      </Highlight>,
    )
    expect(html).toBe('<div><p>the cat sat</p></div>')
  })

  test('as prop을 존중하고 style/className을 전달해야 함', () => {
    const html = renderToStaticMarkup(
      <Highlight
        query="cat"
        name="search"
        as="section"
        className="wrap"
        style={{ display: 'contents' }}
      >
        text
      </Highlight>,
    )
    expect(html).toContain('<section')
    expect(html).toContain('class="wrap"')
    expect(html).toContain('display:contents')
  })
})
