import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useOverflowDetection, OverflowDemo } from './is-overflowing'

vi.mock('ahooks', () => ({
  useSize: vi.fn(),
}))

const mockUseSize = vi.hoisted(() => vi.fn())

function createPropertyManager() {
  const originalProps: Record<string, PropertyDescriptor | undefined> = {}

  function saveOriginalProperty(propertyName: string) {
    originalProps[propertyName] = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      propertyName
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
    mockUseSize.mockImplementation(() => ({ width: 100, height: 20 }))
    propertyManager.saveAll(properties)
  })

  afterEach(() => {
    vi.clearAllMocks()

    propertyManager.restoreAll(properties)
  })

  it('ref.current가 null일 때 오버플로우가 false를 반환해야 함', () => {
    const { result } = renderHook(() => useOverflowDetection())

    expect(result.current.hasHorizontalOverflow).toBe(false)
    expect(result.current.hasVerticalOverflow).toBe(false)
    expect(result.current.ref.current).toBeNull()
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
    mockUseSize.mockImplementation(() => ({ width: 100, height: 20 }))
    propertyManager.saveAll(properties)
  })

  afterEach(() => {
    vi.clearAllMocks()
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

    expect(screen.getByText('Horizontal overflow detected')).toBeInTheDocument()
    expect(
      screen.queryByText('Vertical overflow detected')
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

    expect(screen.getByText('Vertical overflow detected')).toBeInTheDocument()
    expect(
      screen.queryByText('Horizontal overflow detected')
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

    expect(screen.getByText('Content fits')).toBeInTheDocument()
    expect(
      screen.queryByText('Horizontal overflow detected')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Vertical overflow detected')
    ).not.toBeInTheDocument()
  })

  it('커스텀 props를 받을 수 있어야 함', () => {
    render(
      <OverflowDemo
        containerWidth={200}
        containerHeight={100}
        showVerticalDemo={true}
      />
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
