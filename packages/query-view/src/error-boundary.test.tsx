import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'

function Boom({ shouldThrow }: { shouldThrow: () => boolean }): ReactNode {
  if (shouldThrow()) throw new Error('boom')

  return <span data-testid="ok">ok</span>
}

function silenceReactErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('ErrorBoundary', () => {
  it('에러가 없으면 children을 렌더해야 함', () => {
    render(
      <ErrorBoundary fallback={() => <p data-testid="fallback">실패</p>}>
        <Boom shouldThrow={() => false} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  it('자식이 던진 에러를 fallback으로 갈아 끼워야 함', () => {
    const spy = silenceReactErrorLog()

    render(
      <ErrorBoundary
        fallback={(error) => (
          <p data-testid="fallback">{(error as Error).message}</p>
        )}
      >
        <Boom shouldThrow={() => true} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('fallback')).toHaveTextContent('boom')

    spy.mockRestore()
  })

  it('onError로 에러와 컴포넌트 스택을 보고해야 함', () => {
    const spy = silenceReactErrorLog()
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError} fallback={() => <p>실패</p>}>
        <Boom shouldThrow={() => true} />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][1]).toHaveProperty('componentStack')

    spy.mockRestore()
  })

  it('retry가 onReset을 호출하고 children을 다시 렌더해야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true
    const onReset = vi.fn(() => {
      failing = false
    })

    render(
      <ErrorBoundary
        onReset={onReset}
        fallback={(_error, retry) => (
          <button data-testid="retry" onClick={retry}>
            재시도
          </button>
        )}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByTestId('retry'))

    expect(onReset).toHaveBeenCalledOnce()
    expect(screen.getByTestId('ok')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('resetKeys가 바뀌면 자동으로 리셋해야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true

    const { rerender } = render(
      <ErrorBoundary
        resetKeys={['a']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()

    failing = false
    rerender(
      <ErrorBoundary
        resetKeys={['b']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('resetKeys의 길이가 달라져도 리셋해야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true

    const { rerender } = render(
      <ErrorBoundary
        resetKeys={['a']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    failing = false
    rerender(
      <ErrorBoundary
        resetKeys={['a', 'b']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('resetKeys가 그대로면 리셋하지 않아야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true

    const { rerender } = render(
      <ErrorBoundary
        resetKeys={['a']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    failing = false
    rerender(
      <ErrorBoundary
        resetKeys={['a']}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()

    spy.mockRestore()
  })
})
