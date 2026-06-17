import { useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HighlightStoreProvider } from './highlight-context'
import { createHighlightStore, createNoopSink } from './highlight-store'
import { useHighlightSearch } from './use-highlight-search'

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

function renderHarness(query: string, text: string) {
  const store = createHighlightStore({ sink: createNoopSink() })
  const utils = render(
    <HighlightStoreProvider store={store}>
      <Harness query={query} text={text} />
    </HighlightStoreProvider>,
  )
  return { store, ...utils }
}

const count = (): string => screen.getByTestId('count').textContent ?? ''
const active = (): string => screen.getByTestId('active').textContent ?? ''

describe('useHighlightSearch', () => {
  it('매치 개수를 count로 노출하고 store에도 반영해야 함', () => {
    const { store } = renderHarness('a', 'a b a b a')

    expect(count()).toBe('3')
    expect(store.getSnapshot().search).toBe(3)
    expect(active()).toBe('0')
  })

  it('현재 항목을 search-current 이름으로 별도 등록해야 함', () => {
    const { store } = renderHarness('a', 'a b a b a')

    expect(store.getSnapshot()['search-current']).toBe(1)
  })

  it('next가 활성 인덱스를 순환시켜야 함', () => {
    renderHarness('a', 'a b a b a')

    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('1')
    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('2')
    fireEvent.click(screen.getByTestId('next'))
    expect(active()).toBe('0')
  })

  it('prev가 역방향으로 순환(wrap)해야 함', () => {
    renderHarness('a', 'a b a b a')

    fireEvent.click(screen.getByTestId('prev'))
    expect(active()).toBe('2')
  })

  it('매치가 없으면 count는 0, active는 -1이어야 함', () => {
    renderHarness('zzz', 'a b a b a')

    expect(count()).toBe('0')
    expect(active()).toBe('-1')
  })
})
