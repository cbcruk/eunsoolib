import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryView } from './query-view'
import type { QueryLike } from './types'

type Item = string

function query(
  overrides: Partial<QueryLike<Item[]>> & Pick<QueryLike<Item[]>, 'status'>,
): QueryLike<Item[]> {
  return { data: undefined, error: null, ...overrides }
}

function list(items: readonly Item[]) {
  return <span data-testid="content">{items.join(',')}</span>
}

function wrapper(testId: string) {
  return (content: ReactNode) => <div data-testid={testId}>{content}</div>
}

describe('QueryView 교체 층', () => {
  it('시도 이전이면 idle 슬롯을 렌더해야 함', () => {
    render(
      <QueryView
        query={query({ status: 'pending', fetchStatus: 'idle' })}
        idle={<p data-testid="idle">검색어를 입력하세요</p>}
        placeholder={<p data-testid="placeholder">로딩</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('idle')).toBeInTheDocument()
    expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument()
  })

  it('delay 이전에는 placeholder를 렌더하지 않아야 함', () => {
    vi.useFakeTimers()

    render(
      <QueryView
        query={query({ status: 'pending', fetchStatus: 'fetching' })}
        placeholder={<p data-testid="placeholder">로딩</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(200))

    expect(screen.getByTestId('placeholder')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('함수 placeholder에 경과 시간과 loading 상태를 넘겨야 함', () => {
    vi.useFakeTimers()

    render(
      <QueryView
        query={query({ status: 'pending', fetchStatus: 'paused' })}
        placeholder={(elapsed, state) => (
          <p data-testid="placeholder">{`${elapsed}/${state.paused}`}</p>
        )}
      >
        {list}
      </QueryView>,
    )

    act(() => void vi.advanceTimersByTime(200))
    expect(screen.getByTestId('placeholder')).toHaveTextContent('0/true')

    act(() => void vi.advanceTimersByTime(800))
    expect(screen.getByTestId('placeholder')).toHaveTextContent('1000/true')

    vi.useRealTimers()
  })

  it('보여줄 data가 없는 실패는 fallback으로 가야 함', () => {
    const error = new Error('boom')

    render(
      <QueryView
        query={query({ status: 'error', error, fetchStatus: 'fetching' })}
        fallback={(received, _retry, state) => (
          <p data-testid="fallback">{`${(received as Error).message}/${state.retrying}`}</p>
        )}
        degraded={() => <p data-testid="degraded">degraded</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('fallback')).toHaveTextContent('boom/true')
    expect(screen.queryByTestId('degraded')).not.toBeInTheDocument()
  })

  it('fallback을 넘기지 않은 실패는 아무것도 렌더하지 않아야 함', () => {
    const { container } = render(
      <QueryView query={query({ status: 'error', error: new Error('boom') })}>
        {list}
      </QueryView>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('retry는 기본적으로 query.refetch를 호출해야 함', () => {
    const refetch = vi.fn()

    render(
      <QueryView
        query={query({ status: 'error', error: new Error('boom'), refetch })}
        fallback={(_error, retry) => (
          <button data-testid="retry" onClick={retry}>
            재시도
          </button>
        )}
      >
        {list}
      </QueryView>,
    )

    screen.getByTestId('retry').click()

    expect(refetch).toHaveBeenCalledOnce()
  })

  it('onRetry를 넘기면 refetch 대신 그것을 써야 함', () => {
    const refetch = vi.fn()
    const onRetry = vi.fn()

    render(
      <QueryView
        query={query({ status: 'error', error: new Error('boom'), refetch })}
        onRetry={onRetry}
        fallback={(_error, retry) => (
          <button data-testid="retry" onClick={retry}>
            재시도
          </button>
        )}
      >
        {list}
      </QueryView>,
    )

    screen.getByTestId('retry').click()

    expect(onRetry).toHaveBeenCalledOnce()
    expect(refetch).not.toHaveBeenCalled()
  })

  it('refetch도 onRetry도 없으면 retry 호출이 던지지 않아야 함', () => {
    render(
      <QueryView
        query={query({ status: 'error', error: new Error('boom') })}
        fallback={(_error, retry) => (
          <button data-testid="retry" onClick={retry}>
            재시도
          </button>
        )}
      >
        {list}
      </QueryView>,
    )

    expect(() => screen.getByTestId('retry').click()).not.toThrow()
  })
})

describe('QueryView 중첩 층', () => {
  it('data가 있으면 children을 렌더해야 함', () => {
    render(
      <QueryView query={query({ status: 'success', data: ['a', 'b'] })}>
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('content')).toHaveTextContent('a,b')
  })

  it('중첩 슬롯을 넘기지 않으면 콘텐츠만 렌더해야 함', () => {
    render(
      <QueryView
        query={query({
          status: 'success',
          data: ['a'],
          fetchStatus: 'fetching',
          isPlaceholderData: true,
        })}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('content')).toHaveTextContent('a')
  })

  it('refreshing 슬롯이 콘텐츠를 교체하지 않고 감싸야 함', () => {
    render(
      <QueryView
        query={query({
          status: 'success',
          data: ['a'],
          fetchStatus: 'fetching',
        })}
        refreshing={wrapper('refreshing')}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('refreshing')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('paused는 refreshing 대신 켜져야 함', () => {
    render(
      <QueryView
        query={query({ status: 'success', data: ['a'], fetchStatus: 'paused' })}
        refreshing={wrapper('refreshing')}
        paused={wrapper('paused')}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('paused')).toBeInTheDocument()
    expect(screen.queryByTestId('refreshing')).not.toBeInTheDocument()
  })

  it('provisional ⊂ refreshing 순서로 감싸야 함', () => {
    render(
      <QueryView
        query={query({
          status: 'success',
          data: ['a'],
          fetchStatus: 'fetching',
          isPlaceholderData: true,
        })}
        refreshing={wrapper('refreshing')}
        provisional={wrapper('provisional')}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('refreshing')).toContainElement(
      screen.getByTestId('provisional'),
    )
    expect(screen.getByTestId('provisional')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('이전 data가 남은 실패는 fallback이 아니라 degraded여야 함', () => {
    const error = new Error('refresh failed')

    render(
      <QueryView
        query={query({ status: 'error', error, data: ['a'] })}
        fallback={() => <p data-testid="fallback">fallback</p>}
        degraded={(received, _retry, content) => (
          <div data-testid="degraded">
            <span data-testid="banner">{(received as Error).message}</span>
            {content}
          </div>
        )}
      >
        {list}
      </QueryView>,
    )

    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('banner')).toHaveTextContent('refresh failed')
    expect(screen.getByTestId('degraded')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('degraded ⊃ paused 순서로 감싸야 함', () => {
    render(
      <QueryView
        query={query({
          status: 'error',
          error: new Error('x'),
          data: ['a'],
          fetchStatus: 'paused',
        })}
        paused={wrapper('paused')}
        degraded={(_error, _retry, content) => (
          <div data-testid="degraded">{content}</div>
        )}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('degraded')).toContainElement(
      screen.getByTestId('paused'),
    )
    expect(screen.getByTestId('paused')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('degraded의 retry도 refetch로 이어져야 함', () => {
    const refetch = vi.fn()

    render(
      <QueryView
        query={query({
          status: 'error',
          error: new Error('x'),
          data: ['a'],
          refetch,
        })}
        degraded={(_error, retry, content) => (
          <div>
            <button data-testid="retry" onClick={retry}>
              재시도
            </button>
            {content}
          </div>
        )}
      >
        {list}
      </QueryView>,
    )

    screen.getByTestId('retry').click()

    expect(refetch).toHaveBeenCalledOnce()
  })

  it('degraded 슬롯을 넘기지 않으면 콘텐츠만 렌더해야 함', () => {
    render(
      <QueryView
        query={query({ status: 'error', error: new Error('x'), data: ['a'] })}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('content')).toHaveTextContent('a')
  })
})

describe('QueryView empty', () => {
  it('빈 결과에 empty 슬롯을 렌더해야 함', () => {
    render(
      <QueryView
        query={query({ status: 'success', data: [] })}
        empty={<p data-testid="empty">결과 없음</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('empty')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('empty를 넘기지 않으면 빈 결과라도 children을 렌더해야 함', () => {
    render(
      <QueryView query={query({ status: 'success', data: [] })}>
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('함수 empty 슬롯에 data를 넘겨야 함', () => {
    render(
      <QueryView
        query={query({ status: 'success', data: [] })}
        empty={(data) => <p data-testid="empty">{`${data.length}건`}</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('empty')).toHaveTextContent('0건')
  })

  it('isEmpty로 도메인 판정을 대신할 수 있어야 함', () => {
    render(
      <QueryView
        query={query({ status: 'success', data: ['none'] })}
        isEmpty={(data) => data[0] === 'none'}
        empty={<p data-testid="empty">결과 없음</p>}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('빈 결과라도 중첩 슬롯은 그대로 감싸야 함', () => {
    render(
      <QueryView
        query={query({ status: 'success', data: [], fetchStatus: 'fetching' })}
        empty={<p data-testid="empty">결과 없음</p>}
        refreshing={wrapper('refreshing')}
      >
        {list}
      </QueryView>,
    )

    expect(screen.getByTestId('refreshing')).toContainElement(
      screen.getByTestId('empty'),
    )
  })
})
