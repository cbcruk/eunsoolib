import { render, screen } from '@testing-library/react'
import { SuspenseQueryView } from './suspense-query-view'

function list(items: readonly string[]) {
  return <span data-testid="content">{items.join(',')}</span>
}

describe('SuspenseQueryView', () => {
  it('중첩 슬롯을 QueryView에 그대로 위임해야 함', () => {
    render(
      <SuspenseQueryView
        query={{
          status: 'success',
          data: ['a'],
          error: null,
          fetchStatus: 'fetching',
        }}
        refreshing={(content) => <div data-testid="refreshing">{content}</div>}
      >
        {list}
      </SuspenseQueryView>,
    )

    expect(screen.getByTestId('refreshing')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('빈 결과에 empty 슬롯을 렌더해야 함', () => {
    render(
      <SuspenseQueryView
        query={{ status: 'success', data: [], error: null }}
        empty={<p data-testid="empty">없음</p>}
      >
        {list}
      </SuspenseQueryView>,
    )

    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('교체 층 상태가 들어오면 개발 빌드에서 경고해야 함', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <SuspenseQueryView
        query={{ status: 'pending', data: undefined, error: null }}
      >
        {list}
      </SuspenseQueryView>,
    )

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[SuspenseQueryView]'),
      'pending',
    )

    spy.mockRestore()
  })

  it('data 없는 실패도 경고해야 함', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <SuspenseQueryView
        query={{ status: 'error', data: undefined, error: new Error('x') }}
      >
        {list}
      </SuspenseQueryView>,
    )

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[SuspenseQueryView]'),
      'error',
    )

    spy.mockRestore()
  })

  it('이전 data가 남은 실패는 경고하지 않아야 함', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <SuspenseQueryView
        query={{ status: 'error', data: ['a'], error: new Error('x') }}
        degraded={(_error, _retry, content) => (
          <div data-testid="degraded">{content}</div>
        )}
      >
        {list}
      </SuspenseQueryView>,
    )

    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByTestId('degraded')).toBeInTheDocument()

    spy.mockRestore()
  })
})
