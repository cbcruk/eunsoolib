import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useStuck, type UseStuckOptions } from './use-stuck'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}

  setIntersecting(isIntersecting: boolean): void {
    act(() => {
      this.callback(
        [{ isIntersecting }] as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      )
    })
  }

  static latest(): MockIntersectionObserver {
    return this.instances[this.instances.length - 1]!
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

function StuckHarness(props: UseStuckOptions): ReactNode {
  const { sentinelRef, isStuck } = useStuck(props)
  return (
    <div ref={sentinelRef} data-testid="stuck">
      {String(isStuck)}
    </div>
  )
}

describe('useStuck', () => {
  it('sentinel이 보이지 않으면 stuck=true가 되어야 함', () => {
    render(<StuckHarness />)

    MockIntersectionObserver.latest().setIntersecting(false)
    expect(screen.getByTestId('stuck').textContent).toBe('true')

    MockIntersectionObserver.latest().setIntersecting(true)
    expect(screen.getByTestId('stuck').textContent).toBe('false')
  })

  it('offset을 rootMargin에 반영해야 함', () => {
    render(<StuckHarness offset={16} />)
    expect(MockIntersectionObserver.latest().options?.rootMargin).toBe(
      '-16px 0px 0px 0px',
    )
  })

  it('onStuckChange는 scrollend 시점에만 현재 stuck 상태로 호출돼야 함', () => {
    const onStuckChange = vi.fn()
    render(<StuckHarness onStuckChange={onStuckChange} />)

    // IO로 stuck이 되어도 scrollend 전에는 콜백 호출 안 됨
    MockIntersectionObserver.latest().setIntersecting(false)
    expect(onStuckChange).not.toHaveBeenCalled()

    act(() => {
      document.dispatchEvent(new Event('scrollend'))
    })
    expect(onStuckChange).toHaveBeenCalledWith(true)
  })
})
