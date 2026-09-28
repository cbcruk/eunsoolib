import { applyCamera } from './apply-camera'
import { createFakeMap, installFakeNaver } from './fake-naver'

type ResizeCallback = () => void

function stubResizeObserver() {
  const instances: {
    callback: ResizeCallback
    disconnect: ReturnType<typeof vi.fn>
  }[] = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      constructor(readonly callback: ResizeCallback) {
        instances.push(this)
      }
      observe(): void {}
    },
  )
  return instances
}

describe('applyCamera', () => {
  beforeEach(() => {
    installFakeNaver()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keep이면 지도를 건드리지 않는다', () => {
    const { map, asMap } = createFakeMap()
    applyCamera(asMap, { type: 'keep' })
    expect(map.setCenter).not.toHaveBeenCalled()
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('center면 중심과 줌을 설정하고 줌은 maxZoom을 넘지 않는다', () => {
    const { map, asMap } = createFakeMap()
    applyCamera(
      asMap,
      { type: 'center', at: { lat: 37.5, lng: 127 }, zoom: 19 },
      { maxZoom: 17 },
    )
    expect(map.setCenter.mock.calls[0][0].lat()).toBe(37.5)
    expect(map.setZoom).toHaveBeenCalledWith(17)
  })

  it('fit이면 margin과 maxZoom을 fitBounds 옵션으로 넘긴다', () => {
    const { map, asMap } = createFakeMap()
    applyCamera(
      asMap,
      {
        type: 'fit',
        sw: { lat: 37.4, lng: 127 },
        ne: { lat: 37.6, lng: 127.2 },
      },
      { margin: { top: 80, bottom: 160 }, maxZoom: 16 },
    )
    const [bounds, fitOptions] = map.fitBounds.mock.calls[0]
    expect(bounds.sw.lat()).toBe(37.4)
    expect(bounds.ne.lng()).toBe(127.2)
    expect(fitOptions).toEqual({ top: 80, bottom: 160, maxZoom: 16 })
  })

  it('maxZoom을 주지 않으면 17로 제한한다', () => {
    const { map, asMap } = createFakeMap()
    applyCamera(asMap, {
      type: 'fit',
      sw: { lat: 37.4, lng: 127 },
      ne: { lat: 37.6, lng: 127.2 },
    })
    expect(map.fitBounds.mock.calls[0][1]).toEqual({ maxZoom: 17 })
  })

  it('컨테이너 크기가 0이면 크기가 생길 때까지 기다렸다가 refresh 후 적용한다', () => {
    const observers = stubResizeObserver()
    const { map, asMap, size } = createFakeMap({ width: 0, height: 0 })
    applyCamera(asMap, {
      type: 'center',
      at: { lat: 37.5, lng: 127 },
      zoom: 16,
    })

    expect(map.setCenter).not.toHaveBeenCalled()

    observers[0].callback()
    expect(map.setCenter).not.toHaveBeenCalled()

    size.width = 400
    size.height = 300
    observers[0].callback()
    expect(map.refresh).toHaveBeenCalled()
    expect(map.setCenter).toHaveBeenCalled()
    expect(observers[0].disconnect).toHaveBeenCalled()
  })

  it('반환된 함수로 대기를 취소할 수 있다', () => {
    const observers = stubResizeObserver()
    const { asMap } = createFakeMap({ width: 0, height: 0 })
    const cancel = applyCamera(asMap, {
      type: 'center',
      at: { lat: 37.5, lng: 127 },
      zoom: 16,
    })
    cancel()
    expect(observers[0].disconnect).toHaveBeenCalled()
  })
})
