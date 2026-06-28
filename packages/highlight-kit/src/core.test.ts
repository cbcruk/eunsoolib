import { beforeEach, describe, expect, test } from 'vitest'
import {
  computeRanges,
  generateHighlightCSS,
  getTextNodes,
  highlights,
  isHighlightSupported,
  rangesFromOffsets,
} from './core'

function mount(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('getTextNodes', () => {
  test('공백만 있는 노드는 건너뛰고 텍스트 노드를 수집해야 함', () => {
    const el = mount('<p>alpha</p>\n  <p>beta<span> gamma</span></p>')
    const text = getTextNodes(el).map((n) => n.textContent)
    expect(text).toEqual(['alpha', 'beta', ' gamma'])
  })
})

describe('computeRanges', () => {
  test('기본은 대소문자 무시로 문자열을 매칭해야 함', () => {
    const el = mount('<p>The Cat sat on the cat mat</p>')
    const ranges = computeRanges(el, 'cat')
    expect(ranges).toHaveLength(2)
    expect(ranges.map((r) => r.toString())).toEqual(['Cat', 'cat'])
  })

  test('caseSensitive를 존중해야 함', () => {
    const el = mount('<p>Cat cat</p>')
    expect(computeRanges(el, 'cat', { caseSensitive: true })).toHaveLength(1)
  })

  test('wholeWord를 존중해야 함', () => {
    const el = mount('<p>cat category cat</p>')
    expect(computeRanges(el, 'cat', { wholeWord: true })).toHaveLength(2)
  })

  test('RegExp를 받아 global 플래그를 붙여야 함', () => {
    const el = mount('<p>a1 b2 c3</p>')
    const ranges = computeRanges(el, /[a-z]\d/)
    expect(ranges.map((r) => r.toString())).toEqual(['a1', 'b2', 'c3'])
  })

  test('요소 경계를 넘는 매칭은 하지 않아야 함', () => {
    const el = mount('<p>ca<span>t</span></p>')
    expect(computeRanges(el, 'cat')).toHaveLength(0)
  })

  test('빈 패턴은 빈 배열을 반환해야 함', () => {
    const el = mount('<p>anything</p>')
    expect(computeRanges(el, '')).toEqual([])
  })

  test('zero-width 정규식에서 무한 루프에 빠지지 않아야 함', () => {
    const el = mount('<p>abc</p>')
    expect(computeRanges(el, /(?:)/)).toEqual([])
  })
})

describe('rangesFromOffsets', () => {
  test('플랫 offset을 텍스트 노드에 매핑하고 경계를 넘어야 함', () => {
    const el = mount('<p>foo</p><p>bar</p>')
    // "foobar" — offset 2..5는 노드 경계를 가로지른다 (o|ob|ar -> "ob"+"a")
    const ranges = rangesFromOffsets(el, [{ start: 2, end: 5 }])
    expect(ranges.map((r) => r.toString()).join('')).toBe('oba')
  })
})

describe('generateHighlightCSS', () => {
  test('kebab-case 속성으로 ::highlight() 규칙을 만들어야 함', () => {
    const css = generateHighlightCSS({
      search: { backgroundColor: '#fef08a', color: '#854d0e' },
    })
    expect(css).toContain('::highlight(search)')
    expect(css).toContain('background-color: #fef08a;')
    expect(css).toContain('color: #854d0e;')
  })
})

describe('Highlight API 미지원 환경', () => {
  test('isHighlightSupported가 false를 반환해야 함', () => {
    expect(isHighlightSupported()).toBe(false)
  })

  test('set은 안전한 no-op이고 snapshot은 비어 있어야 함', () => {
    const el = mount('<p>cat</p>')
    highlights.set('search', 'src', computeRanges(el, 'cat'))
    expect(highlights.getSnapshot('search')).toEqual({
      active: false,
      count: 0,
    })
  })
})
