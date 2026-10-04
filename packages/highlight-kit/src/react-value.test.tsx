import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createHighlightController,
  createNoopSink,
  type HighlightController,
} from './core'
import type { TokenRule } from './tokenize'
import {
  HighlightProvider,
  useValueHighlight,
  useValueHighlightSearch,
  useValueTokens,
} from './react'
import {
  allValueRanges,
  installValueRangeApi,
  liveValueRanges,
  uninstallValueRangeApi,
} from './value-range.fixture'

function renderWithController(ui: React.ReactElement): {
  controller: HighlightController
} & ReturnType<typeof render> {
  const controller = createHighlightController({ sink: createNoopSink() })
  const utils = render(
    <HighlightProvider controller={controller}>{ui}</HighlightProvider>,
  )
  return { controller, ...utils }
}

const RULES: TokenRule[] = [
  { name: 'comment', pattern: /\/\/[^\n]*/ },
  { name: 'keyword', pattern: /\bconst\b/, priority: 1 },
]

const area = (): HTMLTextAreaElement =>
  screen.getByTestId('area') as HTMLTextAreaElement
const text = (id: string): string => screen.getByTestId(id).textContent ?? ''

/** Type into an uncontrolled control the way a user would. */
function type(value: string): void {
  fireEvent.input(area(), { target: { value } })
}

beforeEach(() => {
  installValueRangeApi()
})

afterEach(() => {
  uninstallValueRangeApi()
})

describe('useValueTokens', () => {
  function Tokens({
    rules = RULES,
    initial = '',
  }: {
    rules?: TokenRule[]
    initial?: string
  }) {
    const { ref, supported, counts } = useValueTokens<HTMLTextAreaElement>(
      rules,
      {},
    )
    return (
      <div>
        <textarea data-testid="area" ref={ref} defaultValue={initial} />
        <span data-testid="supported">{String(supported)}</span>
        <span data-testid="keyword">{counts.keyword ?? 0}</span>
        <span data-testid="comment">{counts.comment ?? 0}</span>
      </div>
    )
  }

  it('마운트 시 초기 value를 토큰화해 controller에 등록해야 함', () => {
    const { controller } = renderWithController(
      <Tokens initial="const a // note" />,
    )

    expect(text('supported')).toBe('true')
    expect(controller.getSnapshot('keyword').count).toBe(1)
    expect(controller.getSnapshot('comment').count).toBe(1)
  })

  it('name별 매치 개수를 counts로 노출해야 함', () => {
    renderWithController(<Tokens initial="const a const b // x" />)

    expect(text('keyword')).toBe('2')
    expect(text('comment')).toBe('1')
  })

  it('입력에 따라 재토큰화해야 함', () => {
    renderWithController(<Tokens initial="x" />)
    expect(text('keyword')).toBe('0')

    type('const a const b')

    expect(text('keyword')).toBe('2')
  })

  it('주석 안의 키워드는 등록하지 않아야 함', () => {
    renderWithController(<Tokens initial="// const a" />)

    expect(text('comment')).toBe('1')
    expect(text('keyword')).toBe('0')
  })

  it('반복 입력에도 live Range가 누적되지 않아야 함', () => {
    renderWithController(<Tokens initial="const a" />)

    for (let i = 0; i < 10; i++) type(`const a${'!'.repeat(i)}`)

    expect(allValueRanges().length).toBeGreaterThan(10)
    expect(liveValueRanges()).toHaveLength(1)
  })

  it('언마운트 시 등록을 해제하고 Range를 disconnect해야 함', () => {
    const { controller, unmount } = renderWithController(
      <Tokens initial="const a // note" />,
    )

    unmount()

    expect(controller.getSnapshot('keyword').active).toBe(false)
    expect(controller.getSnapshot('comment').active).toBe(false)
    expect(liveValueRanges()).toEqual([])
  })

  it('인라인 rules 배열로 리렌더해도 highlighter를 재생성하지 않아야 함', () => {
    function Rerender() {
      const [, setTick] = useState(0)
      // A fresh array identity on every render, as callers usually write it.
      const { counts } = useValueTokens<HTMLTextAreaElement>([
        { name: 'keyword', pattern: /\bconst\b/ },
      ])
      const { ref } = useValueTokens<HTMLTextAreaElement>([])
      return (
        <div>
          <textarea data-testid="area" ref={ref} />
          <span data-testid="keyword">{counts.keyword ?? 0}</span>
          <button data-testid="tick" onClick={() => setTick((t) => t + 1)}>
            tick
          </button>
        </div>
      )
    }

    renderWithController(<Rerender />)
    const before = allValueRanges().length

    fireEvent.click(screen.getByTestId('tick'))
    fireEvent.click(screen.getByTestId('tick'))

    expect(allValueRanges().length).toBe(before)
  })

  it('rules 내용이 바뀌면 다시 등록해야 함', () => {
    const { controller, rerender } = renderWithController(
      <Tokens rules={RULES} initial="const a // note" />,
    )
    expect(controller.getSnapshot('keyword').count).toBe(1)

    rerender(
      <HighlightProvider controller={controller}>
        <Tokens rules={[{ name: 'comment', pattern: /\/\/[^\n]*/ }]} initial="const a // note" />
      </HighlightProvider>,
    )

    expect(controller.getSnapshot('keyword').active).toBe(false)
    expect(controller.getSnapshot('comment').count).toBe(1)
  })

  it('controlled value가 프로그램적으로 바뀌면 재토큰화해야 함', () => {
    function Controlled() {
      const [value, setValue] = useState('x')
      const { ref, counts } = useValueTokens<HTMLTextAreaElement>(RULES, {
        value,
      })
      return (
        <div>
          <textarea
            data-testid="area"
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <span data-testid="keyword">{counts.keyword ?? 0}</span>
          <button data-testid="load" onClick={() => setValue('const a')}>
            load
          </button>
        </div>
      )
    }

    renderWithController(<Controlled />)
    expect(text('keyword')).toBe('0')

    fireEvent.click(screen.getByTestId('load'))

    expect(text('keyword')).toBe('1')
  })

  it('observe: false면 입력을 추적하지 않아야 함', () => {
    function NoObserve() {
      const { ref, counts } = useValueTokens<HTMLTextAreaElement>(RULES, {
        observe: false,
      })
      return (
        <div>
          <textarea data-testid="area" ref={ref} />
          <span data-testid="keyword">{counts.keyword ?? 0}</span>
        </div>
      )
    }

    renderWithController(<NoObserve />)
    type('const a')

    expect(text('keyword')).toBe('0')
  })

  it('미지원 브라우저면 supported가 false이고 아무것도 등록하지 않아야 함', () => {
    uninstallValueRangeApi()
    const { controller } = renderWithController(
      <Tokens initial="const a // note" />,
    )

    expect(text('supported')).toBe('false')
    expect(controller.getSnapshot('keyword').active).toBe(false)
    expect(allValueRanges()).toEqual([])
  })

  it('미지원 input type이면 supported가 false여야 함', () => {
    function NumberInput() {
      const { ref, supported } = useValueTokens<HTMLInputElement>(RULES)
      return (
        <div>
          <input data-testid="area" type="number" ref={ref} />
          <span data-testid="supported">{String(supported)}</span>
        </div>
      )
    }

    renderWithController(<NumberInput />)
    expect(text('supported')).toBe('false')
  })
})

describe('useValueHighlight', () => {
  function Single({ query, name }: { query: string | RegExp; name?: string }) {
    const { ref, count, active, name: resolved } =
      useValueHighlight<HTMLTextAreaElement>({ query, name })
    return (
      <div>
        <textarea data-testid="area" ref={ref} defaultValue="cat dog cat" />
        <span data-testid="count">{count}</span>
        <span data-testid="active">{String(active)}</span>
        <span data-testid="name">{resolved}</span>
      </div>
    )
  }

  it('단일 패턴의 매치 개수를 노출해야 함', () => {
    const { controller } = renderWithController(
      <Single query="cat" name="flagged" />,
    )

    expect(text('count')).toBe('2')
    expect(text('active')).toBe('true')
    expect(controller.getSnapshot('flagged').count).toBe(2)
  })

  it('name을 생략하면 인스턴스별 고유 이름을 만들어야 함', () => {
    renderWithController(<Single query="cat" />)
    expect(text('name')).toMatch(/^hk-value-/)
  })

  it('query가 비면 아무것도 등록하지 않아야 함', () => {
    const { controller } = renderWithController(
      <Single query="" name="flagged" />,
    )

    expect(text('count')).toBe('0')
    expect(text('active')).toBe('false')
    expect(controller.getSnapshot('flagged').active).toBe(false)
  })

  it('RegExp query도 받아야 함', () => {
    renderWithController(<Single query={/\bcat\b/} name="flagged" />)
    expect(text('count')).toBe('2')
  })
})

describe('useValueHighlightSearch', () => {
  function Search({ query }: { query: string }) {
    const { ref, count, active, next, prev, supported } =
      useValueHighlightSearch<HTMLTextAreaElement>(query)
    return (
      <div>
        <textarea data-testid="area" ref={ref} defaultValue="a b a b a" />
        <span data-testid="count">{count}</span>
        <span data-testid="active">{active}</span>
        <span data-testid="supported">{String(supported)}</span>
        <button data-testid="next" onClick={next}>
          next
        </button>
        <button data-testid="prev" onClick={prev}>
          prev
        </button>
      </div>
    )
  }

  const next = (): void => {
    fireEvent.click(screen.getByTestId('next'))
  }
  const prev = (): void => {
    fireEvent.click(screen.getByTestId('prev'))
  }

  it('전체 매치를 base name에, 현재 매치를 -current에 등록해야 함', () => {
    const { controller } = renderWithController(<Search query="a" />)

    expect(text('count')).toBe('3')
    expect(controller.getSnapshot('search').count).toBe(3)
    expect(controller.getSnapshot('search-current').count).toBe(1)
  })

  it('next/prev로 active가 순환해야 함', () => {
    renderWithController(<Search query="a" />)
    expect(text('active')).toBe('0')

    next()
    expect(text('active')).toBe('1')
    next()
    next()
    expect(text('active')).toBe('0')

    prev()
    expect(text('active')).toBe('2')
  })

  it('매치가 없으면 active가 -1이어야 함', () => {
    const { controller } = renderWithController(<Search query="zzz" />)

    expect(text('count')).toBe('0')
    expect(text('active')).toBe('-1')
    expect(controller.getSnapshot('search').active).toBe(false)
    expect(controller.getSnapshot('search-current').active).toBe(false)
  })

  it('입력으로 매치가 줄면 active를 범위 안으로 맞춰야 함', () => {
    renderWithController(<Search query="a" />)
    next()
    next()
    expect(text('active')).toBe('2')

    type('a')

    expect(text('count')).toBe('1')
    expect(text('active')).toBe('0')
  })

  it('입력에 따라 count를 갱신해야 함', () => {
    renderWithController(<Search query="a" />)
    type('a a a a')
    expect(text('count')).toBe('4')
  })

  it('네비게이션을 반복해도 live Range가 누적되지 않아야 함', () => {
    renderWithController(<Search query="a" />)
    for (let i = 0; i < 12; i++) next()

    // 3 base ranges + 1 current range stay registered.
    expect(liveValueRanges()).toHaveLength(4)
  })

  it('언마운트 시 두 name 모두 해제하고 Range를 disconnect해야 함', () => {
    const { controller, unmount } = renderWithController(<Search query="a" />)
    unmount()

    expect(controller.getSnapshot('search').active).toBe(false)
    expect(controller.getSnapshot('search-current').active).toBe(false)
    expect(liveValueRanges()).toEqual([])
  })

  it('미지원 브라우저면 supported가 false여야 함', () => {
    uninstallValueRangeApi()
    renderWithController(<Search query="a" />)

    expect(text('supported')).toBe('false')
    expect(allValueRanges()).toEqual([])
  })
})
