import { render, screen, fireEvent } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { ResetBoundary, Resettable } from './reset-boundary'

function CounterHarness({ deps }: { deps: readonly unknown[] }): ReactNode {
  return (
    <ResetBoundary deps={deps}>
      <Resettable initial={0}>
        {(count, setCount) => (
          <button data-testid="counter" onClick={() => setCount((c) => c + 1)}>
            {count}
          </button>
        )}
      </Resettable>
    </ResetBoundary>
  )
}

function counter(): HTMLElement {
  return screen.getByTestId('counter')
}

describe('Resettable', () => {
  it('ResetBoundary 밖에서 렌더하면 에러를 던져야 함', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() =>
      render(<Resettable initial={0}>{() => null}</Resettable>),
    ).toThrow(/must be rendered inside a <ResetBoundary>/)

    spy.mockRestore()
  })

  it('lazy initializer를 초기값으로 사용해야 함', () => {
    render(
      <ResetBoundary deps={[]}>
        <Resettable initial={() => 42}>
          {(value) => <span data-testid="lazy">{value}</span>}
        </Resettable>
      </ResetBoundary>,
    )

    expect(screen.getByTestId('lazy').textContent).toBe('42')
  })
})

describe('ResetBoundary', () => {
  it('deps가 그대로면 리렌더되어도 상태를 보존해야 함', () => {
    const { rerender } = render(<CounterHarness deps={[1]} />)

    fireEvent.click(counter())
    fireEvent.click(counter())
    expect(counter().textContent).toBe('2')

    rerender(<CounterHarness deps={[1]} />)
    expect(counter().textContent).toBe('2')
  })

  it('deps가 바뀌면 상태를 초기값으로 리셋해야 함', () => {
    const { rerender } = render(<CounterHarness deps={[1]} />)

    fireEvent.click(counter())
    expect(counter().textContent).toBe('1')

    rerender(<CounterHarness deps={[2]} />)
    expect(counter().textContent).toBe('0')
  })

  it('deps 길이가 늘어나도 리셋해야 함 ([1,2] -> [1,2,3])', () => {
    const { rerender } = render(<CounterHarness deps={[1, 2]} />)

    fireEvent.click(counter())
    expect(counter().textContent).toBe('1')

    rerender(<CounterHarness deps={[1, 2, 3]} />)
    expect(counter().textContent).toBe('0')
  })

  it('객체 deps는 참조(Object.is)로 비교해야 함', () => {
    const sameRef = { id: 1 }
    const { rerender } = render(<CounterHarness deps={[sameRef]} />)

    fireEvent.click(counter())
    expect(counter().textContent).toBe('1')

    rerender(<CounterHarness deps={[sameRef]} />)
    expect(counter().textContent).toBe('1')

    rerender(<CounterHarness deps={[{ id: 1 }]} />)
    expect(counter().textContent).toBe('0')
  })

  it('경계 안이지만 Resettable 밖의 상태는 리셋되지 않아야 함', () => {
    function PreservedCounter(): ReactNode {
      const [n, setN] = useState(0)
      return (
        <button data-testid="preserved" onClick={() => setN((v) => v + 1)}>
          {n}
        </button>
      )
    }

    function Harness({ deps }: { deps: readonly unknown[] }): ReactNode {
      return (
        <ResetBoundary deps={deps}>
          <PreservedCounter />
          <Resettable initial={0}>
            {(count, setCount) => (
              <button
                data-testid="counter"
                onClick={() => setCount((c) => c + 1)}
              >
                {count}
              </button>
            )}
          </Resettable>
        </ResetBoundary>
      )
    }

    const { rerender } = render(<Harness deps={[1]} />)

    fireEvent.click(screen.getByTestId('preserved'))
    fireEvent.click(counter())
    expect(screen.getByTestId('preserved').textContent).toBe('1')
    expect(counter().textContent).toBe('1')

    rerender(<Harness deps={[2]} />)
    expect(screen.getByTestId('preserved').textContent).toBe('1')
    expect(counter().textContent).toBe('0')
  })
})
