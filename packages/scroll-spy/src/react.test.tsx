import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { useScrollSpy, useScrollSpyHeadings, useSmoothScroll } from './react'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed = new Set<Element>()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe(el: Element): void {
    this.observed.add(el)
  }
  unobserve(el: Element): void {
    this.observed.delete(el)
  }
  disconnect(): void {
    this.observed.clear()
  }

  trigger(id: string, top: number): void {
    this.callback(
      [
        {
          target: document.getElementById(id) as Element,
          isIntersecting: true,
          boundingClientRect: { top } as DOMRectReadOnly,
        },
      ] as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    )
  }

  static latest(): MockIntersectionObserver {
    return this.instances[this.instances.length - 1]!
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  vi.stubGlobal('CSS', { supports: () => false })
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useScrollSpy', () => {
  function Nav(): ReactNode {
    const { navRef, currentId, isNative } = useScrollSpy()
    return (
      <nav
        ref={navRef}
        data-testid="nav"
        data-current={currentId ?? ''}
        data-native={String(isNative)}
      >
        <a href="#a">A</a>
        <a href="#b">B</a>
      </nav>
    )
  }

  it('교차하는 섹션이 들어오면 currentId가 갱신되어야 함', () => {
    render(
      <>
        <Nav />
        <section id="a">A</section>
        <section id="b">B</section>
      </>,
    )

    expect(screen.getByTestId('nav').getAttribute('data-native')).toBe('false')

    act(() => {
      MockIntersectionObserver.latest().trigger('a', 10)
    })

    expect(screen.getByTestId('nav').getAttribute('data-current')).toBe('a')
  })
})

describe('useScrollSpyHeadings', () => {
  it('컨테이너의 헤딩을 추출하고 id를 부여해야 함', () => {
    document.body.innerHTML = `
      <h2>First Section</h2>
      <h3 id="second">Second</h3>
    `

    const { result } = renderHook(() =>
      useScrollSpyHeadings({ container: document.body }),
    )

    expect(result.current.headings).toHaveLength(2)
    expect(result.current.headings[0]).toMatchObject({
      id: 'first-section',
      text: 'First Section',
      level: 2,
    })
    expect(result.current.headings[1]!.id).toBe('second')
  })
})

describe('useSmoothScroll', () => {
  it('앵커 클릭 시 기본 동작을 막고 해시를 갱신해야 함', () => {
    document.body.innerHTML = `<section id="target">T</section>`
    const { result } = renderHook(() => useSmoothScroll())

    function Link(): ReactNode {
      return (
        <a href="#target" onClick={result.current.handleClick}>
          go
        </a>
      )
    }
    render(<Link />)

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    const link = screen.getByText('go')
    act(() => {
      link.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(window.location.hash).toBe('#target')
  })

  it('존재하지 않는 대상이면 아무 동작도 하지 않아야 함', () => {
    const { result } = renderHook(() => useSmoothScroll())
    expect(() => result.current.scrollTo('missing')).not.toThrow()
  })
})
