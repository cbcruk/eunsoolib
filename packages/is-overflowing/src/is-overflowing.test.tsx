import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useState } from 'react'
import { useOverflowDetection } from './is-overflowing'
import { OverflowDemo } from './overflow-demo'

class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  readonly callback: ResizeObserverCallback
  targets: Element[] = []

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(target: Element) {
    this.targets.push(target)
  }

  unobserve() {}

  disconnect() {
    this.targets = []
  }

  trigger() {
    act(() => {
      this.callback([], this as unknown as ResizeObserver)
    })
  }
}

function createPropertyManager() {
  const originalProps: Record<string, PropertyDescriptor | undefined> = {}

  function saveOriginalProperty(propertyName: string) {
    originalProps[propertyName] = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      propertyName,
    )
  }

  function restoreOriginalProperty(propertyName: string) {
    const original = originalProps[propertyName]

    if (original) {
      Object.defineProperty(HTMLElement.prototype, propertyName, original)
    }
  }

  function mockProperty(propertyName: string, getValue: () => number) {
    Object.defineProperty(HTMLElement.prototype, propertyName, {
      configurable: true,
      get: getValue,
    })
  }

  function saveAll(properties: string[]) {
    properties.forEach(saveOriginalProperty)
  }

  function restoreAll(properties: string[]) {
    properties.forEach(restoreOriginalProperty)
  }

  return { saveAll, restoreAll, mockProperty }
}

describe('useOverflowDetection 훅', () => {
  const propertyManager = createPropertyManager()
  const properties = [
    'scrollWidth',
    'clientWidth',
    'scrollHeight',
    'clientHeight',
  ]

  beforeEach(async () => {
    MockResizeObserver.instances = []
    propertyManager.saveAll(properties)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    propertyManager.restoreAll(properties)
  })

  it('ref.current가 null일 때 오버플로우가 false를 반환해야 함', () => {
    const { result } = renderHook(() => useOverflowDetection())

    expect(result.current.hasHorizontalOverflow).toBe(false)
    expect(result.current.hasVerticalOverflow).toBe(false)
    expect(result.current.ref.current).toBeNull()
  })

  function Truncated({ text = '짧은 텍스트' }: { text?: string }) {
    const { ref, hasHorizontalOverflow, hasVerticalOverflow } =
      useOverflowDetection()

    return (
      <div>
        <div ref={ref} data-testid="target">
          <span data-testid="content">{text}</span>
        </div>
        <output data-testid="result">
          {`${hasHorizontalOverflow}/${hasVerticalOverflow}`}
        </output>
      </div>
    )
  }

  function mockSizes(sizes: {
    scrollWidth: number
    clientWidth: number
    scrollHeight?: number
    clientHeight?: number
  }) {
    const { scrollHeight = 0, clientHeight = 0 } = sizes

    propertyManager.mockProperty('scrollWidth', () => sizes.scrollWidth)
    propertyManager.mockProperty('clientWidth', () => sizes.clientWidth)
    propertyManager.mockProperty('scrollHeight', () => scrollHeight)
    propertyManager.mockProperty('clientHeight', () => clientHeight)
  }

  it('추가 리렌더 없이 첫 커밋 직후 오버플로우를 반영해야 함', () => {
    mockSizes({
      scrollWidth: 200,
      clientWidth: 100,
      scrollHeight: 80,
      clientHeight: 40,
    })

    render(<Truncated />)

    expect(screen.getByTestId('result')).toHaveTextContent('true/true')
  })

  it('엘리먼트 크기는 그대로이고 내용만 바뀌어도 값을 갱신해야 함', async () => {
    const sizes = { scrollWidth: 80, clientWidth: 100 }

    mockSizes(sizes)
    render(<Truncated />)

    expect(screen.getByTestId('result')).toHaveTextContent('false/false')

    sizes.scrollWidth = 300
    await act(async () => {
      screen.getByTestId('content').textContent = '아주 길어진 텍스트'
    })

    expect(screen.getByTestId('result')).toHaveTextContent('true/false')
  })

  it('ResizeObserver로 대상과 자식의 크기 변화를 감지해야 함', () => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver)

    const sizes = { scrollWidth: 200, clientWidth: 100 }

    mockSizes(sizes)
    render(<Truncated />)

    const observer = MockResizeObserver.instances[0]

    expect(observer.targets).toEqual([
      screen.getByTestId('target'),
      screen.getByTestId('content'),
    ])
    expect(screen.getByTestId('result')).toHaveTextContent('true/false')

    sizes.clientWidth = 400
    observer.trigger()

    expect(screen.getByTestId('result')).toHaveTextContent('false/false')
  })

  it('나중에 연결된 엘리먼트도 측정해야 함', () => {
    mockSizes({ scrollWidth: 200, clientWidth: 100 })

    function Delayed() {
      const [visible, setVisible] = useState(false)
      const { ref, hasHorizontalOverflow } = useOverflowDetection()

      return (
        <div>
          <button onClick={() => setVisible(true)}>보이기</button>
          {visible && <div ref={ref} />}
          <output data-testid="result">{String(hasHorizontalOverflow)}</output>
        </div>
      )
    }

    render(<Delayed />)

    expect(screen.getByTestId('result')).toHaveTextContent('false')

    act(() => {
      screen.getByText('보이기').click()
    })

    expect(screen.getByTestId('result')).toHaveTextContent('true')
  })
})

describe('OverflowDemo 컴포넌트', () => {
  const propertyManager = createPropertyManager()
  const properties = [
    'scrollWidth',
    'clientWidth',
    'scrollHeight',
    'clientHeight',
  ]

  beforeEach(async () => {
    propertyManager.saveAll(properties)
  })

  afterEach(() => {
    propertyManager.restoreAll(properties)
  })

  it('콘텐츠가 가로로 오버플로우할 때 메시지를 표시해야 함', async () => {
    propertyManager.mockProperty('scrollWidth', () => 200)
    propertyManager.mockProperty('clientWidth', () => 100)
    propertyManager.mockProperty('scrollHeight', () => 50)
    propertyManager.mockProperty('clientHeight', () => 50)

    const { rerender } = render(<OverflowDemo />)

    await act(async () => {
      rerender(<OverflowDemo />)
    })

    expect(screen.getByText(/Horizontal overflow detected/)).toBeInTheDocument()
    expect(
      screen.queryByText(/Vertical overflow detected/),
    ).not.toBeInTheDocument()
  })

  it('세로 데모가 활성화되고 콘텐츠가 세로로 오버플로우할 때 메시지를 표시해야 함', async () => {
    propertyManager.mockProperty('scrollWidth', () => 80)
    propertyManager.mockProperty('clientWidth', () => 100)
    propertyManager.mockProperty('scrollHeight', () => 150)
    propertyManager.mockProperty('clientHeight', () => 60)

    const { rerender } = render(<OverflowDemo showVerticalDemo={true} />)

    await act(async () => {
      rerender(<OverflowDemo showVerticalDemo={true} />)
    })

    expect(screen.getByText(/Vertical overflow detected/)).toBeInTheDocument()
    expect(
      screen.queryByText(/Horizontal overflow detected/),
    ).not.toBeInTheDocument()
  })

  it('오버플로우가 없을 때 콘텐츠가 맞음 메시지를 표시해야 함', async () => {
    propertyManager.mockProperty('scrollWidth', () => 80)
    propertyManager.mockProperty('clientWidth', () => 100)
    propertyManager.mockProperty('scrollHeight', () => 40)
    propertyManager.mockProperty('clientHeight', () => 60)

    const { rerender } = render(<OverflowDemo />)

    await act(async () => {
      rerender(<OverflowDemo />)
    })

    expect(screen.getByText(/Content fits/)).toBeInTheDocument()
    expect(
      screen.queryByText(/Horizontal overflow detected/),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Vertical overflow detected/),
    ).not.toBeInTheDocument()
  })

  it('커스텀 props를 받을 수 있어야 함', () => {
    render(
      <OverflowDemo
        containerWidth={200}
        containerHeight={100}
        showVerticalDemo={true}
      />,
    )

    const container = screen.getByText('Item0').closest('div')?.parentElement

    expect(container).toHaveStyle({
      width: '200px',
      height: '100px',
    })
  })

  it('OverflowDemo와의 하위 호환성을 유지해야 함', () => {
    render(<OverflowDemo />)

    expect(screen.getByText('Item0')).toBeInTheDocument()
  })
})
