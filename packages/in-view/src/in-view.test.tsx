import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import { InView } from './in-view'
import { useIntersectionObserver } from './use-intersection-observer'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit | undefined
  readonly targets: Element[] = []
  disconnected = false

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.targets.push(target)
  }

  disconnect() {
    this.disconnected = true
  }

  unobserve() {}

  takeRecords() {
    return []
  }

  trigger(isIntersecting: boolean) {
    const entries = this.targets.map(
      (target) => ({ target, isIntersecting }) as IntersectionObserverEntry,
    )

    act(() => {
      this.callback(entries, this as unknown as IntersectionObserver)
    })
  }
}

const activeObservers = () =>
  MockIntersectionObserver.instances.filter((o) => !o.disconnected)

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InView', () => {
  it('인라인 onIntersect로 리렌더링해도 observer를 다시 만들지 않아야 함', () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = render(
      <InView onIntersect={() => first()}>내용</InView>,
    )
    rerender(<InView onIntersect={() => second()}>내용</InView>)
    rerender(<InView onIntersect={() => second()}>내용</InView>)

    expect(MockIntersectionObserver.instances).toHaveLength(1)

    activeObservers()[0].trigger(true)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('교차하지 않는 항목만 오면 onIntersect를 호출하지 않아야 함', () => {
    const onIntersect = vi.fn()

    render(<InView onIntersect={onIntersect}>내용</InView>)
    activeObservers()[0].trigger(false)

    expect(onIntersect).not.toHaveBeenCalled()
  })

  it('객체 ref를 넘겨도 관찰 대상 div가 유지되어야 함', () => {
    const ref = createRef<HTMLDivElement>()

    const { getByTestId } = render(
      <InView ref={ref} data-testid="target" onIntersect={() => {}}>
        내용
      </InView>,
    )
    const target = getByTestId('target')

    expect(ref.current).toBe(target)
    expect(activeObservers()).toHaveLength(1)
    expect(activeObservers()[0].targets).toEqual([target])
  })

  it('콜백 ref를 넘겨도 관찰 대상 div가 유지되어야 함', () => {
    const callbackRef = vi.fn()

    const { getByTestId, unmount } = render(
      <InView ref={callbackRef} data-testid="target" onIntersect={() => {}}>
        내용
      </InView>,
    )
    const target = getByTestId('target')

    expect(callbackRef).toHaveBeenCalledWith(target)
    expect(activeObservers()[0].targets).toEqual([target])

    unmount()

    expect(callbackRef).toHaveBeenLastCalledWith(null)
  })

  it('root와 rootMargin을 observer 옵션으로 전달해야 함', () => {
    const root = document.createElement('div')

    render(
      <InView onIntersect={() => {}} root={root} rootMargin="200px 0px">
        내용
      </InView>,
    )

    expect(activeObservers()[0].options).toEqual({
      root,
      rootMargin: '200px 0px',
      threshold: 0.1,
    })
  })

  it('enabled가 false면 관찰하지 않아야 함', () => {
    render(
      <InView onIntersect={() => {}} enabled={false}>
        내용
      </InView>,
    )

    expect(MockIntersectionObserver.instances).toHaveLength(0)
  })
})

describe('useIntersectionObserver', () => {
  it('제네릭 엘리먼트 타입의 ref로 관찰해야 함', () => {
    const onIntersect = vi.fn()

    function List() {
      const { ref } = useIntersectionObserver<HTMLUListElement>({
        onIntersect,
      })

      return <ul ref={ref} data-testid="list" />
    }

    const { getByTestId } = render(<List />)

    expect(activeObservers()[0].targets).toEqual([getByTestId('list')])

    activeObservers()[0].trigger(true)

    expect(onIntersect).toHaveBeenCalledTimes(1)
  })
})
