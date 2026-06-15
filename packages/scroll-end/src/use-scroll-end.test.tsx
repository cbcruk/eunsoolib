import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useRef, type ReactNode } from 'react'
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
})
