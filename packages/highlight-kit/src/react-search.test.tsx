import { useRef, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createHighlightController, createNoopSink } from './core'
import { Highlight, HighlightProvider, useHighlightSearch } from './react'

function renderWithController(ui: React.ReactElement) {
  const controller = createHighlightController({ sink: createNoopSink() })
  const utils = render(
    <HighlightProvider controller={controller}>{ui}</HighlightProvider>,
  )
  return { controller, ...utils }
}

function Harness({ query, text }: { query: string; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { count, active, next, prev } = useHighlightSearch(ref, query)
  return (
    <div>
      <div ref={ref}>{text}</div>
      <span data-testid="count">{count}</span>
      <span data-testid="active">{active}</span>
      <button data-testid="next" onClick={next}>
        next
      </button>
      <button data-testid="prev" onClick={prev}>
        prev
      </button>
    </div>
  )
}

const count = (): string => screen.getByTestId('count').textContent ?? ''
const active = (): string => screen.getByTestId('active').textContent ?? ''

describe('useHighlightSearch', () => {
  it('매치 개수를 count로 노출하고 controller에도 반영해야 함', () => {
    const { controller } = renderWithController(
      <Harness query="a" text="a b a b a" />,
    )

    expect(count()).toBe('3')
    expect(controller.getSnapshot('search').count).toBe(3)
    expect(active()).toBe('0')
  })

  it('현재 항목을 search-current 이름으로 별도 등록해야 함', () => {
    const { controller } = renderWithController(
      <Harness query="a" text="a b a b a" />,
    )

    expect(controller.getSnapshot('search-current').count).toBe(1)
  })

  it('next가 활성 인덱스를 순환시켜야 함', () => {
    renderWithController(<Harness query="a" text="a b a b a" />)

    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('1')
    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('2')
    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('0')
  })

  it('prev가 역방향으로 순환(wrap)해야 함', () => {
    renderWithController(<Harness query="a" text="a b a b a" />)

    fireEvent.click(screen.getByTestId('prev'))
    expect(active()).toBe('2')
  })

  it('매치가 없으면 count는 0, active는 -1이어야 함', () => {
    renderWithController(<Harness query="zzz" text="a b a b a" />)

    expect(count()).toBe('0')
    expect(active()).toBe('-1')
  })
})

describe('<Highlight.Root> / <Highlight.Match>', () => {
  it('여러 Match가 각자의 name으로 등록되고, name 생략 시 Root의 name을 써야 함', () => {
    const { controller } = renderWithController(
      <Highlight.Root name="log-info" as="pre">
        {'INFO: a\nERROR: b\nINFO: c'}
        <Highlight.Match name="log-error" pattern={/ERROR:[^\n]*/} />
        <Highlight.Match pattern={/INFO:[^\n]*/} />
      </Highlight.Root>,
    )

    expect(controller.getSnapshot('log-error').count).toBe(1)
    expect(controller.getSnapshot('log-info').count).toBe(2)
  })

  it('Root 밖에서 Match를 쓰면 에러를 던져야 함', () => {
    const spy = console.error
    console.error = () => {}
    try {
      expect(() =>
        renderWithController(<Highlight.Match pattern="a" />),
      ).toThrow('<Highlight.Match> must be used inside <Highlight.Root>')
    } finally {
      console.error = spy
    }
  })

  it('unmount 시 등록한 Range를 정리해야 함', () => {
    const { controller, unmount } = renderWithController(
      <Highlight.Root name="kw">
        const x = 1
        <Highlight.Match pattern="const" />
      </Highlight.Root>,
    )
    expect(controller.getSnapshot('kw').count).toBe(1)

    unmount()
    expect(controller.getSnapshot('kw').active).toBe(false)
  })
})

describe('<Highlight observe>', () => {
  function Dynamic() {
    const [text, setText] = useState('cat')
    return (
      <>
        <button onClick={() => setText('cat cat cat')}>grow</button>
        <Highlight query="cat" name="dyn" observe>
          <p>{text}</p>
        </Highlight>
      </>
    )
  }

  it('observe면 컨테이너 텍스트가 바뀔 때 다시 계산해야 함', async () => {
    const { controller } = renderWithController(<Dynamic />)
    expect(controller.getSnapshot('dyn').count).toBe(1)

    await act(async () => {
      fireEvent.click(screen.getByText('grow'))
    })
    expect(controller.getSnapshot('dyn').count).toBe(3)
  })
})
