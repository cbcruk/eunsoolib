import { cleanup, renderHook } from '@testing-library/react'
import { createFakeMap, installFakeNaver, type FakeMarker } from './fake-naver'
import { useMarkerLayer } from './react'

interface Place {
  id: string
  lat: number
}

describe('useMarkerLayer', () => {
  let markers: FakeMarker[]

  beforeEach(() => {
    markers = installFakeNaver().markers
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const render = (map: naver.maps.Map | null, items: Place[], name = 'x') =>
    renderHook(
      ({ map, items, name }) =>
        useMarkerLayer(map, items, {
          getId: (place) => place.id,
          getPosition: (place) => ({ lat: place.lat, lng: 127 }),
          render: (place) => `${name}:${place.id}`,
        }),
      { initialProps: { map, items, name } },
    )

  it('map이 없으면 빈 결과를 반환한다', () => {
    const { result } = render(null, [{ id: 'a', lat: 37 }])
    expect(result.current.points).toEqual([])
    expect(markers).toHaveLength(0)
  })

  it('items가 바뀌면 마커를 동기화하고 points를 돌려준다', () => {
    const { asMap } = createFakeMap()
    const { result, rerender } = render(asMap, [{ id: 'a', lat: 37 }])
    expect(result.current.points).toEqual([{ lat: 37, lng: 127 }])

    rerender({ map: asMap, items: [{ id: 'b', lat: 38 }], name: 'x' })
    expect(markers[0].map).toBeNull()
    expect(result.current.points).toEqual([{ lat: 38, lng: 127 }])
  })

  it('인라인 옵션이 바뀌어도 레이어를 다시 만들지 않고 최신 render를 쓴다', () => {
    const { asMap } = createFakeMap()
    const items = [{ id: 'a', lat: 37 }]
    const { rerender } = render(asMap, items, 'before')
    rerender({ map: asMap, items: [...items], name: 'after' })

    expect(markers).toHaveLength(1)
    expect(markers[0].icon.content).toBe('after:a')
  })

  it('언마운트하면 마커를 모두 떼어낸다', () => {
    const { asMap } = createFakeMap()
    const { unmount } = render(asMap, [{ id: 'a', lat: 37 }])
    unmount()
    expect(markers[0].map).toBeNull()
  })
})
