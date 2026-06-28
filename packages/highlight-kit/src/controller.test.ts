import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computeRanges, highlights } from './core'

/**
 * jsdom은 CSS Custom Highlight API를 구현하지 않으므로, controller의 reconcile
 * 경로를 검증하기 위해 최소 폴리필을 주입한다. `Highlight`는 Range를 모으고,
 * `CSS.highlights`는 단순 maplike 레지스트리다.
 */
class HighlightPolyfill extends Set<Range> {
  priority = 0
  readonly type = 'highlight'
  constructor(...ranges: Range[]) {
    super(ranges)
  }
}

function registry(): Map<string, unknown> {
  return (
    globalThis as unknown as { CSS: { highlights: Map<string, unknown> } }
  ).CSS.highlights
}

function mount(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('Highlight', HighlightPolyfill)
  vi.stubGlobal('CSS', { highlights: new Map() })
})

afterEach(() => {
  highlights.clearAll()
  vi.unstubAllGlobals()
})

describe('HighlightController', () => {
  test('set은 Highlight를 등록하고 snapshot을 갱신해야 함', () => {
    const el = mount('<p>cat cat</p>')
    highlights.set('search', 'a', computeRanges(el, 'cat'))

    expect(highlights.getSnapshot('search')).toEqual({ active: true, count: 2 })
    expect(registry().has('search')).toBe(true)
  })

  test('한 name 아래 여러 source의 range를 union해야 함', () => {
    const el = mount('<p>cat dog cat dog</p>')
    highlights.set('hl', 'cats', computeRanges(el, 'cat'))
    highlights.set('hl', 'dogs', computeRanges(el, 'dog'))

    expect(highlights.getSnapshot('hl').count).toBe(4)
  })

  test('remove는 한 source만 제거하고 나머지는 유지해야 함', () => {
    const el = mount('<p>cat dog cat dog</p>')
    highlights.set('hl', 'cats', computeRanges(el, 'cat'))
    highlights.set('hl', 'dogs', computeRanges(el, 'dog'))

    highlights.remove('hl', 'cats')
    expect(highlights.getSnapshot('hl').count).toBe(2)
    expect(registry().has('hl')).toBe(true)
  })

  test('마지막 source 제거 시 레지스트리 항목이 사라져야 함', () => {
    const el = mount('<p>cat</p>')
    highlights.set('hl', 'only', computeRanges(el, 'cat'))
    highlights.remove('hl', 'only')

    expect(highlights.getSnapshot('hl')).toEqual({ active: false, count: 0 })
    expect(registry().has('hl')).toBe(false)
  })

  test('clear는 source와 무관하게 name 전체를 제거해야 함', () => {
    const el = mount('<p>cat dog</p>')
    highlights.set('hl', 'a', computeRanges(el, 'cat'))
    highlights.set('hl', 'b', computeRanges(el, 'dog'))

    highlights.clear('hl')
    expect(registry().has('hl')).toBe(false)
    expect(highlights.getSnapshot('hl').active).toBe(false)
  })

  test('clearAll은 관리하는 모든 name을 비워야 함', () => {
    const el = mount('<p>cat dog</p>')
    highlights.set('one', 's', computeRanges(el, 'cat'))
    highlights.set('two', 's', computeRanges(el, 'dog'))

    highlights.clearAll()
    expect(registry().size).toBe(0)
    expect(highlights.getSnapshot('one').active).toBe(false)
    expect(highlights.getSnapshot('two').active).toBe(false)
  })

  test('무관한 변경 사이에 snapshot 참조가 안정적이어야 함', () => {
    const el = mount('<p>cat dog</p>')
    highlights.set('a', 's', computeRanges(el, 'cat'))
    const first = highlights.getSnapshot('a')

    highlights.set('b', 's', computeRanges(el, 'dog'))
    expect(highlights.getSnapshot('a')).toBe(first)
  })

  test('subscribe는 변경 시 통지되고 unsubscribe 후 멈춰야 함', () => {
    const el = mount('<p>cat</p>')
    let calls = 0
    const unsubscribe = highlights.subscribe(() => {
      calls++
    })

    highlights.set('a', 's', computeRanges(el, 'cat'))
    expect(calls).toBe(1)

    unsubscribe()
    highlights.set('a', 's', computeRanges(el, 'cat'))
    expect(calls).toBe(1)
  })
})
