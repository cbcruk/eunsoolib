import { createFakeMap, installFakeNaver, type FakeMarker } from './fake-naver'
import { createMarkerLayer } from './marker-layer'
import type { MarkerLayerOptions } from './types'

interface Place {
  id: string
  name: string
  latitude?: number
  longitude?: number
}

const options: MarkerLayerOptions<Place> = {
  getId: (place) => place.id,
  getPosition: (place) =>
    place.latitude === undefined || place.longitude === undefined
      ? null
      : { lat: place.latitude, lng: place.longitude },
  render: (place) => `<div>${place.name}</div>`,
}

const place = (id: string, lat?: number, name = id): Place => ({
  id,
  name,
  latitude: lat,
  longitude: lat === undefined ? undefined : 127,
})

describe('createMarkerLayer', () => {
  let markers: FakeMarker[]

  beforeEach(() => {
    markers = installFakeNaver().markers
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('항목마다 마커를 만들어 지도에 붙인다', () => {
    const { asMap } = createFakeMap()
    const layer = createMarkerLayer(asMap, options)
    const result = layer.sync([place('a', 37.1), place('b', 37.2)])

    expect(markers).toHaveLength(2)
    expect(markers[0].map).toBe(asMap)
    expect(result.points).toEqual([
      { lat: 37.1, lng: 127 },
      { lat: 37.2, lng: 127 },
    ])
  })

  it('좌표가 없거나 유한하지 않은 항목은 건너뛴다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, options)
    const result = layer.sync([
      place('a', 37.1),
      place('b'),
      place('c', Number.NaN),
    ])
    expect(markers).toHaveLength(1)
    expect(result.located).toBe(1)
  })

  it('limit은 좌표 없는 항목을 거른 뒤에 적용한다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, {
      ...options,
      limit: 2,
    })
    const result = layer.sync([
      place('a'),
      place('b', 37.2),
      place('c', 37.3),
      place('d', 37.4),
    ])

    expect(result.points).toHaveLength(2)
    expect(result.located).toBe(3)
    expect(result.truncated).toBe(true)
  })

  it('다시 sync하면 사라진 id의 마커를 떼고 리스너를 정리한다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, options)
    layer.sync([place('a', 37.1), place('b', 37.2)])
    const [a, b] = markers

    layer.sync([place('b', 37.2)])

    expect(a.setMap).toHaveBeenCalledWith(null)
    expect(naver.maps.Event.clearInstanceListeners).toHaveBeenCalledWith(a)
    expect(b.setMap).not.toHaveBeenCalled()
    expect(layer.get('a')).toBeUndefined()
  })

  it('남은 마커는 새로 만들지 않고 위치만 옮긴다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, options)
    layer.sync([place('a', 37.1)])
    layer.sync([place('a', 37.5)])

    expect(markers).toHaveLength(1)
    expect(markers[0].position.lat()).toBe(37.5)
  })

  it('렌더 결과가 바뀔 때만 아이콘을 교체한다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, options)
    layer.sync([place('a', 37.1, 'before')])
    layer.sync([place('a', 37.1, 'before')])
    expect(markers[0].setIcon).not.toHaveBeenCalled()

    layer.sync([place('a', 37.1, 'after')])
    expect(markers[0].setIcon).toHaveBeenCalledWith({
      content: '<div>after</div>',
      anchor: undefined,
    })
  })

  it('클릭하면 가장 최근에 sync된 항목을 넘긴다', () => {
    const onClick = vi.fn()
    const layer = createMarkerLayer(createFakeMap().asMap, {
      ...options,
      onClick,
    })
    layer.sync([place('a', 37.1, 'before')])
    layer.sync([place('a', 37.1, 'after')])

    markers[0].listeners.click[0]()
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'after' }),
    )
  })

  it('destroy는 모든 마커를 떼어낸다', () => {
    const layer = createMarkerLayer(createFakeMap().asMap, options)
    layer.sync([place('a', 37.1), place('b', 37.2)])
    layer.destroy()

    expect(markers.every((marker) => marker.map === null)).toBe(true)
    expect(layer.get('b')).toBeUndefined()
  })
})
