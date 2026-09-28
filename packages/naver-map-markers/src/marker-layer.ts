/// <reference types="navermaps" />
import type {
  LatLngLiteral,
  MarkerLayer,
  MarkerLayerOptions,
  SyncResult,
} from './types'

interface Entry<T> {
  marker: naver.maps.Marker
  item: T
  content: string
}

/**
 * Creates a marker layer that reconciles naver map markers with a list of items by id.
 *
 * Each {@linkcode MarkerLayer.sync} removes markers whose id is gone, moves the
 * ones that stayed, replaces an icon only when its rendered HTML changed, and
 * creates the rest. Markers are never rebuilt wholesale, so a changing list
 * does not flicker.
 *
 * Items without a finite position are dropped **before** `limit` is applied,
 * so "top N" means N markers that can actually be shown.
 *
 * Every removal clears the marker's listeners too; `setMap(null)` alone keeps
 * them attached and the marker is never collected.
 *
 * @example Show places and refit the camera
 * ```ts
 * import {
 *   applyCamera,
 *   createMarkerLayer,
 *   planCamera,
 * } from '@cbcruk/naver-map-markers'
 *
 * const layer = createMarkerLayer(map, {
 *   getId: (place) => place.id,
 *   getPosition: (place) =>
 *     place.latitude == null || place.longitude == null
 *       ? null
 *       : { lat: place.latitude, lng: place.longitude },
 *   render: (place) => `<div class="pin">${place.name}</div>`,
 *   limit: 50,
 * })
 *
 * const { points, truncated } = layer.sync(places)
 * applyCamera(map, planCamera(points))
 * ```
 */
export function createMarkerLayer<T>(
  map: naver.maps.Map,
  options: MarkerLayerOptions<T>,
): MarkerLayer<T> {
  const entries = new Map<string, Entry<T>>()

  const remove = (id: string, entry: Entry<T>): void => {
    naver.maps.Event.clearInstanceListeners(entry.marker)
    entry.marker.setMap(null)
    entries.delete(id)
  }

  const create = (id: string, item: T, position: LatLngLiteral): Entry<T> => {
    const content = options.render(item)
    const marker = new naver.maps.Marker({
      map,
      position: new naver.maps.LatLng(position.lat, position.lng),
      icon: { content, anchor: options.anchor },
    })
    if (options.onClick) {
      naver.maps.Event.addListener(marker, 'click', () => {
        const entry = entries.get(id)
        if (entry) options.onClick?.(entry.item)
      })
    }
    return { marker, item, content }
  }

  const sync = (items: T[]): SyncResult => {
    const located: { id: string; item: T; position: LatLngLiteral }[] = []
    for (const item of items) {
      const position = options.getPosition(item)
      if (!position || !isFinitePosition(position)) continue
      located.push({ id: options.getId(item), item, position })
    }
    const shown =
      options.limit === undefined ? located : located.slice(0, options.limit)

    const next = new Set(shown.map(({ id }) => id))
    for (const [id, entry] of entries) {
      if (!next.has(id)) remove(id, entry)
    }

    for (const { id, item, position } of shown) {
      const entry = entries.get(id)
      if (!entry) {
        entries.set(id, create(id, item, position))
        continue
      }
      entry.item = item
      entry.marker.setPosition(
        new naver.maps.LatLng(position.lat, position.lng),
      )
      const content = options.render(item)
      if (content !== entry.content) {
        entry.content = content
        entry.marker.setIcon({ content, anchor: options.anchor })
      }
    }

    return {
      points: shown.map(({ position }) => position),
      located: located.length,
      truncated: shown.length < located.length,
    }
  }

  return {
    sync,
    get: (id) => entries.get(id)?.marker,
    destroy: () => {
      for (const [id, entry] of entries) remove(id, entry)
    },
  }
}

function isFinitePosition({ lat, lng }: LatLngLiteral): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
}
