import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AsyncBoundary } from './async-boundary'

function silenceReactErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

function createSuspender() {
  let settle = (): void => {}
  const pending = new Promise<void>((resolve) => {
    settle = resolve
  })
  let ready = false

  function Suspender(): ReactNode {
    if (!ready) throw pending

    return <span data-testid="ok">ok</span>
  }

  async function resolve(): Promise<void> {
    ready = true
    await act(async () => {
      settle()
      await pending
    })
  }

  return { Suspender, resolve }
}

function Boom({ shouldThrow }: { shouldThrow: () => boolean }): ReactNode {
  if (shouldThrow()) throw new Error('boom')

  return <span data-testid="ok">ok</span>
}

describe('AsyncBoundary', () => {
  it('지연 중에는 placeholder를 렌더해야 함', async () => {
    const { Suspender, resolve } = createSuspender()

    render(
      <AsyncBoundary
        placeholder={<p data-testid="placeholder">로딩</p>}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Suspender />
      </AsyncBoundary>,
    )

    expect(screen.getByTestId('placeholder')).toBeInTheDocument()

    await resolve()

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  it('자식이 던진 에러를 fallback으로 갈아 끼워야 함', () => {
    const spy = silenceReactErrorLog()

    render(
      <AsyncBoundary
        fallback={(error) => (
          <p data-testid="fallback">{(error as Error).message}</p>
        )}
      >
        <Boom shouldThrow={() => true} />
      </AsyncBoundary>,
    )

    expect(screen.getByTestId('fallback')).toHaveTextContent('boom')

    spy.mockRestore()
  })

  it('retry가 onReset을 호출하고 하위 트리를 다시 마운트해야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true
    const onReset = vi.fn(() => {
      failing = false
    })

    render(
      <AsyncBoundary
        onReset={onReset}
        fallback={(_error, retry) => (
          <button data-testid="retry" onClick={retry}>
            재시도
          </button>
        )}
      >
        <Boom shouldThrow={() => failing} />
      </AsyncBoundary>,
    )

    fireEvent.click(screen.getByTestId('retry'))

    expect(onReset).toHaveBeenCalledOnce()
    expect(screen.getByTestId('ok')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('resetKeys가 바뀌면 자동으로 리셋해야 함', () => {
    const spy = silenceReactErrorLog()
    let failing = true

    const view = (keys: readonly unknown[]) => (
      <AsyncBoundary
        resetKeys={keys}
        fallback={() => <p data-testid="fallback">실패</p>}
      >
        <Boom shouldThrow={() => failing} />
      </AsyncBoundary>
    )

    const { rerender } = render(view(['a']))
    expect(screen.getByTestId('fallback')).toBeInTheDocument()

    failing = false
    rerender(view(['b']))

    expect(screen.getByTestId('ok')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('onError로 에러를 보고해야 함', () => {
    const spy = silenceReactErrorLog()
    const onError = vi.fn()

    render(
      <AsyncBoundary onError={onError} fallback={() => <p>실패</p>}>
        <Boom shouldThrow={() => true} />
      </AsyncBoundary>,
    )

    expect(onError).toHaveBeenCalledOnce()

    spy.mockRestore()
  })
})
