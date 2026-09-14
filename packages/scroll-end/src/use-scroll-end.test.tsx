import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { StrictMode, useRef, useState, type ReactNode } from 'react'
import { useScrollEnd } from './use-scroll-end'

afterEach(cleanup)

function fireScrollEnd(target: EventTarget = document): void {
  target.dispatchEvent(new Event('scrollend'))
}

describe('useScrollEnd', () => {
  it('document에서 scrollend 발생 시 핸들러를 호출해야 함', () => {
    const onScrollEnd = vi.fn()
    function Comp(): ReactNode {
      useScrollEnd({ onScrollEnd })
      return null
    }
    render(<Comp />)

    fireScrollEnd()

    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('enabled가 false면 구독하지 않아야 함', () => {
    const onScrollEnd = vi.fn()
    function Comp(): ReactNode {
      useScrollEnd({ onScrollEnd, enabled: false })
      return null
    }
    render(<Comp />)

    fireScrollEnd()

    expect(onScrollEnd).not.toHaveBeenCalled()
  })

  it('리스너 재등록 없이 항상 최신 핸들러를 호출해야 함 (stale closure 방지)', () => {
    const first = vi.fn()
    const second = vi.fn()

    function Comp({ handler }: { handler: () => void }): ReactNode {
      useScrollEnd({ onScrollEnd: handler })
      return null
    }

    const { rerender } = render(<Comp handler={first} />)
    rerender(<Comp handler={second} />)

    fireScrollEnd()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it('target이 ref면 해당 요소의 scrollend만 받아야 함', () => {
    const onScrollEnd = vi.fn()
    let element: HTMLDivElement | null = null

    function Comp(): ReactNode {
      const ref = useRef<HTMLDivElement>(null)
      useScrollEnd({ target: ref, onScrollEnd })
      return (
        <div
          ref={(node) => {
            ref.current = node
            element = node
          }}
        />
      )
    }
    render(<Comp />)

    fireScrollEnd(document)
    expect(onScrollEnd).not.toHaveBeenCalled()

    fireScrollEnd(element!)
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('ref 대상 요소가 나중에 마운트되면 그 요소를 구독해야 함', () => {
    const onScrollEnd = vi.fn()

    function Comp({ show }: { show: boolean }): ReactNode {
      const ref = useRef<HTMLDivElement>(null)
      useScrollEnd({ target: ref, onScrollEnd })
      return show ? <div data-testid="box" ref={ref} /> : null
    }

    const { rerender, getByTestId } = render(<Comp show={false} />)
    rerender(<Comp show />)

    fireScrollEnd(getByTestId('box'))
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('ref 대상 요소가 다른 노드로 교체되면 이전 노드 구독을 해제해야 함', () => {
    const onScrollEnd = vi.fn()

    function Comp({ variant }: { variant: 'a' | 'b' }): ReactNode {
      const ref = useRef<HTMLElement>(null)
      useScrollEnd({ target: ref, onScrollEnd })
      return variant === 'a' ? (
        <section data-testid="a" ref={ref} />
      ) : (
        <article data-testid="b" ref={ref} />
      )
    }

    const { rerender, getByTestId } = render(<Comp variant="a" />)
    const first = getByTestId('a')
    rerender(<Comp variant="b" />)

    fireScrollEnd(first)
    expect(onScrollEnd).not.toHaveBeenCalled()

    fireScrollEnd(getByTestId('b'))
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('요소를 직접 target으로 받으면 callback ref로 늦게 마운트된 요소를 구독해야 함', () => {
    const onScrollEnd = vi.fn()

    function Child({
      onNode,
    }: {
      onNode: (node: HTMLDivElement | null) => void
    }): ReactNode {
      const [ready, setReady] = useState(false)
      return (
        <>
          <button data-testid="mount" onClick={() => setReady(true)} />
          {ready && <div data-testid="box" ref={onNode} />}
        </>
      )
    }

    function Comp(): ReactNode {
      const [el, setEl] = useState<HTMLDivElement | null>(null)
      useScrollEnd({ target: el, onScrollEnd })
      return <Child onNode={setEl} />
    }

    const { getByTestId } = render(<Comp />)
    fireScrollEnd(document)
    expect(onScrollEnd).not.toHaveBeenCalled()

    fireEvent.click(getByTestId('mount'))

    fireScrollEnd(getByTestId('box'))
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('StrictMode와 언마운트에서 리스너를 중복 등록하거나 남기지 않아야 함', () => {
    const onScrollEnd = vi.fn()
    function Comp(): ReactNode {
      useScrollEnd({ onScrollEnd })
      return null
    }
    const { unmount } = render(
      <StrictMode>
        <Comp />
      </StrictMode>,
    )

    fireScrollEnd()
    expect(onScrollEnd).toHaveBeenCalledOnce()

    unmount()
    fireScrollEnd()
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('enabled를 false로 바꾸면 구독을 해제해야 함', () => {
    const onScrollEnd = vi.fn()
    function Comp({ enabled }: { enabled: boolean }): ReactNode {
      useScrollEnd({ onScrollEnd, enabled })
      return null
    }
    const { rerender } = render(<Comp enabled />)
    rerender(<Comp enabled={false} />)

    fireScrollEnd()
    expect(onScrollEnd).not.toHaveBeenCalled()
  })
})
