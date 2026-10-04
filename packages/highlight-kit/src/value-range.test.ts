import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHighlightController, createNoopSink } from './core'
import type { TokenRule } from './tokenize'
import {
  allValueRanges,
  installValueRangeApi,
  liveValueRanges,
  uninstallValueRangeApi,
} from './value-range.fixture'
import {
  createValueHighlighter,
  createValueRangeRegistry,
  createValueRanges,
  disconnectValueRanges,
  isValueRange,
  isValueRangeSupported,
  scrollValueRangeIntoView,
  supportsValueRange,
  type ValueRange,
} from './value-range'

function mountTextarea(value: string): HTMLTextAreaElement {
  const el = document.createElement('textarea')
  el.value = value
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  installValueRangeApi()
})

afterEach(() => {
  uninstallValueRangeApi()
})

describe('isValueRangeSupported', () => {
  test('API가 있으면 true여야 함', () => {
    expect(isValueRangeSupported()).toBe(true)
  })

  test('API가 없으면 false여야 함', () => {
    uninstallValueRangeApi()
    expect(isValueRangeSupported()).toBe(false)
  })
})

describe('supportsValueRange', () => {
  test('textarea는 지원해야 함', () => {
    expect(supportsValueRange(document.createElement('textarea'))).toBe(true)
  })

  test.each(['text', 'search', 'tel', 'url', 'password'])(
    'input[type=%s]는 지원해야 함',
    (type) => {
      const input = document.createElement('input')
      input.type = type
      expect(supportsValueRange(input)).toBe(true)
    },
  )

  test.each(['checkbox', 'number', 'email', 'date', 'color', 'range'])(
    'input[type=%s]는 지원하지 않아야 함',
    (type) => {
      const input = document.createElement('input')
      input.type = type
      expect(supportsValueRange(input)).toBe(false)
    },
  )

  test('type을 생략한 input은 text로 간주해 지원해야 함', () => {
    expect(supportsValueRange(document.createElement('input'))).toBe(true)
  })

  test('form control이 아닌 요소와 null은 지원하지 않아야 함', () => {
    expect(supportsValueRange(document.createElement('div'))).toBe(false)
    expect(supportsValueRange(null)).toBe(false)
  })

  test('브라우저가 미지원이면 textarea도 false여야 함', () => {
    uninstallValueRangeApi()
    expect(supportsValueRange(document.createElement('textarea'))).toBe(false)
  })
})

describe('createValueRanges', () => {
  test('span별로 Range를 만들고 offset을 보존해야 함', () => {
    const el = mountTextarea('hello world')
    const ranges = createValueRanges(el, [
      { start: 0, end: 5 },
      { start: 6, end: 11 },
    ])
    expect(ranges.map((r) => [r.startOffset, r.endOffset])).toEqual([
      [0, 5],
      [6, 11],
    ])
  })

  test('value 길이를 넘는 offset은 throw하지 않고 clamp해야 함', () => {
    const el = mountTextarea('hello')
    const ranges = createValueRanges(el, [{ start: 3, end: 99 }])
    expect(ranges.map((r) => [r.startOffset, r.endOffset])).toEqual([[3, 5]])
  })

  test('clamp 후 비어버린 span은 버려야 함', () => {
    const el = mountTextarea('hello')
    expect(createValueRanges(el, [{ start: 9, end: 20 }])).toEqual([])
  })

  test('collapsed span은 버려야 함 (칠해지지 않으므로)', () => {
    const el = mountTextarea('hello')
    expect(createValueRanges(el, [{ start: 2, end: 2 }])).toEqual([])
  })

  test('start > end인 span은 버려야 함', () => {
    const el = mountTextarea('hello')
    expect(createValueRanges(el, [{ start: 4, end: 1 }])).toEqual([])
  })

  test('미지원 요소면 빈 배열을 반환해야 함', () => {
    const input = document.createElement('input')
    input.type = 'number'
    expect(createValueRanges(input, [{ start: 0, end: 1 }])).toEqual([])
  })
})

describe('isValueRange', () => {
  test('DOM Range와 value range를 구분해야 함', () => {
    const el = mountTextarea('hello')
    const [valueRange] = createValueRanges(el, [{ start: 0, end: 5 }])
    expect(isValueRange(valueRange)).toBe(true)
    expect(isValueRange(document.createRange())).toBe(false)
  })
})

describe('disconnectValueRanges', () => {
  test('모든 Range를 disconnect해야 함', () => {
    const el = mountTextarea('hello')
    const ranges = createValueRanges(el, [{ start: 0, end: 2 }])
    disconnectValueRanges(ranges)
    expect(liveValueRanges()).toEqual([])
  })

  test('두 번 호출해도 안전해야 함', () => {
    const el = mountTextarea('hello')
    const ranges = createValueRanges(el, [{ start: 0, end: 2 }])
    disconnectValueRanges(ranges)
    expect(() => disconnectValueRanges(ranges)).not.toThrow()
  })

  test('disconnect를 구현하지 않은 Range도 건너뛰어야 함', () => {
    const bare = { collapsed: false, startOffset: 0, endOffset: 1 } as ValueRange
    expect(() => disconnectValueRanges([bare])).not.toThrow()
  })
})

describe('createValueRangeRegistry', () => {
  function setup(value = 'hello world') {
    const controller = createHighlightController({ sink: createNoopSink() })
    const element = mountTextarea(value)
    const registry = createValueRangeRegistry({ element, controller })
    return { controller, element, registry }
  }

  test('name별로 controller에 Range를 등록해야 함', () => {
    const { controller, registry } = setup()
    registry.commit([
      { name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] },
      { name: 'b', priority: 2, spans: [{ start: 6, end: 11 }] },
    ])
    expect(controller.getSnapshot('a').count).toBe(1)
    expect(controller.getSnapshot('b').count).toBe(1)
    expect(registry.names).toEqual(['a', 'b'])
  })

  test('commit 시 이전 세대의 Range를 모두 disconnect해야 함', () => {
    const { registry } = setup()
    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] }])
    const first = [...allValueRanges()]

    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 6, end: 11 }] }])

    expect(first.every((r) => r.disconnected)).toBe(true)
    expect(liveValueRanges()).toHaveLength(1)
  })

  test('반복 commit에도 live Range가 누적되지 않아야 함', () => {
    const { registry } = setup()
    for (let i = 0; i < 20; i++) {
      registry.commit([
        { name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] },
      ])
    }
    expect(allValueRanges()).toHaveLength(20)
    expect(liveValueRanges()).toHaveLength(1)
  })

  test('새 commit에서 빠진 name은 등록을 해제해야 함', () => {
    const { controller, registry } = setup()
    registry.commit([
      { name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] },
      { name: 'b', priority: 0, spans: [{ start: 6, end: 11 }] },
    ])
    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] }])

    expect(controller.getSnapshot('b').active).toBe(false)
    expect(registry.names).toEqual(['a'])
  })

  test('매칭이 하나도 없는 name은 등록하지 않아야 함', () => {
    const { controller, registry } = setup()
    registry.commit([{ name: 'a', priority: 0, spans: [] }])
    expect(controller.getSnapshot('a').active).toBe(false)
    expect(registry.names).toEqual([])
  })

  test('priority를 controller에 전달해야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const setSpy = vi.spyOn(controller, 'set')
    const registry = createValueRangeRegistry({
      element: mountTextarea('hello'),
      controller,
    })
    registry.commit([{ name: 'a', priority: 7, spans: [{ start: 0, end: 5 }] }])
    expect(setSpy).toHaveBeenCalledWith('a', expect.anything(), expect.any(Array), 7)
  })

  test('dispose는 등록을 해제하고 Range를 disconnect해야 함', () => {
    const { controller, registry } = setup()
    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] }])
    registry.dispose()

    expect(controller.getSnapshot('a').active).toBe(false)
    expect(liveValueRanges()).toEqual([])
    expect(registry.names).toEqual([])
  })

  test('dispose 후의 commit은 무시해야 함', () => {
    const { controller, registry } = setup()
    registry.dispose()
    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 0, end: 5 }] }])
    expect(controller.getSnapshot('a').active).toBe(false)
  })

  test('미지원 요소면 supported가 false이고 아무것도 등록하지 않아야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const input = document.createElement('input')
    input.type = 'number'
    const registry = createValueRangeRegistry({ element: input, controller })

    registry.commit([{ name: 'a', priority: 0, spans: [{ start: 0, end: 1 }] }])
    expect(registry.supported).toBe(false)
    expect(controller.getSnapshot('a').active).toBe(false)
  })
})

describe('createValueHighlighter', () => {
  const RULES: TokenRule[] = [
    { name: 'comment', pattern: /\/\/[^\n]*/ },
    { name: 'keyword', pattern: /\bconst\b/, priority: 1 },
  ]

  function setup(value: string, options: { observe?: boolean } = {}) {
    const controller = createHighlightController({ sink: createNoopSink() })
    const element = mountTextarea(value)
    const highlighter = createValueHighlighter({
      element,
      rules: RULES,
      controller,
      ...options,
    })
    return { controller, element, highlighter }
  }

  test('생성 시점에 현재 value를 토큰화해 등록해야 함', () => {
    const { controller, highlighter } = setup('const x // note')
    expect(controller.getSnapshot('keyword').count).toBe(1)
    expect(controller.getSnapshot('comment').count).toBe(1)
    expect(highlighter.supported).toBe(true)
  })

  test('주석 안의 키워드는 등록하지 않아야 함 (overlap: first)', () => {
    const { controller } = setup('// const x')
    expect(controller.getSnapshot('comment').count).toBe(1)
    expect(controller.getSnapshot('keyword').active).toBe(false)
  })

  test('input 이벤트에 재토큰화해야 함', () => {
    const { controller, element } = setup('x')
    expect(controller.getSnapshot('keyword').active).toBe(false)

    element.value = 'const a const b'
    element.dispatchEvent(new Event('input'))

    expect(controller.getSnapshot('keyword').count).toBe(2)
  })

  test('재토큰화할 때 이전 세대를 disconnect해 누적하지 않아야 함', () => {
    const { element } = setup('const a')
    for (let i = 0; i < 10; i++) {
      element.value = `const a${'!'.repeat(i)}`
      element.dispatchEvent(new Event('input'))
    }
    expect(allValueRanges().length).toBeGreaterThan(10)
    expect(liveValueRanges()).toHaveLength(1)
  })

  test('observe: false면 input 이벤트를 무시해야 함', () => {
    const { controller, element } = setup('x', { observe: false })
    element.value = 'const a'
    element.dispatchEvent(new Event('input'))
    expect(controller.getSnapshot('keyword').active).toBe(false)
  })

  test('refresh는 프로그램적 value 변경을 반영해야 함', () => {
    const { controller, element, highlighter } = setup('x', { observe: false })
    element.value = 'const a'
    highlighter.refresh()
    expect(controller.getSnapshot('keyword').count).toBe(1)
  })

  test('dispose는 등록을 해제하고 input 구독을 끊어야 함', () => {
    const { controller, element, highlighter } = setup('const a')
    highlighter.dispose()

    expect(controller.getSnapshot('keyword').active).toBe(false)
    expect(liveValueRanges()).toEqual([])

    element.value = 'const b'
    element.dispatchEvent(new Event('input'))
    expect(controller.getSnapshot('keyword').active).toBe(false)
  })

  test('미지원 요소면 supported가 false이고 등록하지 않아야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const input = document.createElement('input')
    input.type = 'email'
    input.value = 'const a'
    const highlighter = createValueHighlighter({
      element: input,
      rules: RULES,
      controller,
    })

    expect(highlighter.supported).toBe(false)
    expect(controller.getSnapshot('keyword').active).toBe(false)
    expect(allValueRanges()).toEqual([])
  })
})

describe('scrollValueRangeIntoView', () => {
  test('rect가 비어 있으면 스크롤하지 않아야 함', () => {
    const el = mountTextarea('hello')
    el.scrollTop = 5
    const [range] = createValueRanges(el, [{ start: 0, end: 5 }])
    scrollValueRangeIntoView(el, range)
    expect(el.scrollTop).toBe(5)
  })
})
