import { render, screen } from '@testing-library/react'
import { Collection } from './collection'

describe('Collection', () => {
  it('목록이 있으면 children을 렌더해야 함', () => {
    render(
      <Collection items={['a', 'b']}>
        {(items) => <span data-testid="content">{items.join(',')}</span>}
      </Collection>,
    )

    expect(screen.getByTestId('content')).toHaveTextContent('a,b')
  })

  it('목록이 비면 empty를 렌더해야 함', () => {
    render(
      <Collection items={[]} empty={<p data-testid="empty">없음</p>}>
        {(items) => <span data-testid="content">{items.length}</span>}
      </Collection>,
    )

    expect(screen.getByTestId('empty')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('empty를 넘기지 않고 목록이 비면 아무것도 렌더하지 않아야 함', () => {
    const { container } = render(
      <Collection items={[]}>{() => <span>content</span>}</Collection>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
