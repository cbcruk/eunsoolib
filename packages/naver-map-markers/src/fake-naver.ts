import { vi } from 'vitest'

class LatLng {
  constructor(
    private readonly y: number,
    private readonly x: number,
  ) {}
  lat(): number {
    return this.y
  }
  lng(): number {
    return this.x
  }
}

class LatLngBounds {
  constructor(
    readonly sw: LatLng,
    readonly ne: LatLng,
  ) {}
}

type Listener = () => void

class Marker {
  map: unknown
  position: LatLng
  icon: { content: string }
  listeners: Record<string, Listener[]> = {}
  setMap = vi.fn((map: unknown) => {
    this.map = map
  })
  setPosition = vi.fn((position: LatLng) => {
    this.position = position
  })
  setIcon = vi.fn((icon: { content: string }) => {
    this.icon = icon
  })
  constructor(options: {
    map: unknown
    position: LatLng
    icon: { content: string }
  }) {
    this.map = options.map
    this.position = options.position
    this.icon = options.icon
    markers.push(this)
  }
}

const markers: Marker[] = []

const Event = {
  addListener: vi.fn((target: Marker, name: string, listener: Listener) => {
    ;(target.listeners[name] ??= []).push(listener)
  }),
  clearInstanceListeners: vi.fn((target: Marker) => {
    target.listeners = {}
  }),
}

/** Installs a minimal `naver.maps` global and returns the markers it creates. */
export function installFakeNaver(): { markers: Marker[] } {
  markers.length = 0
  vi.stubGlobal('naver', { maps: { LatLng, LatLngBounds, Marker, Event } })
  return { markers }
}

/** Creates a fake `naver.maps.Map` whose element has the given size. */
export function createFakeMap(size = { width: 400, height: 300 }) {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', { get: () => size.width })
  Object.defineProperty(element, 'clientHeight', { get: () => size.height })
  const map = {
    getElement: () => element,
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    refresh: vi.fn(),
  }
  return { map, element, size, asMap: map as unknown as naver.maps.Map }
}

export type FakeMarker = Marker
