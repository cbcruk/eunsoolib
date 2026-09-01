import { act, render, screen } from '@testing-library/react'
import { Delayed } from './delayed'

describe('Delayed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delay 이전에는 아무것도 렌더하지 않아야 함', () => {
    const { container } = render(
      <Delayed>
        <p data-testid="skeleton">로딩</p>
      </Delayed>,
    )

    act(() => void vi.advanceTimersByTime(199))

    expect(container).toBeEmptyDOMElement()
  })

  it('delay가 지나면 children을 렌더해야 함', () => {
    render(
      <Delayed delay={300}>
        <p data-testid="skeleton">로딩</p>
      </Delayed>,
    )

    act(() => void vi.advanceTimersByTime(300))

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })
})
