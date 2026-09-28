/// <reference types="navermaps" />
import { useEffect, useRef, useState } from 'react'
import { createMarkerLayer } from './marker-layer'
import type { MarkerLayer, MarkerLayerOptions, SyncResult } from './types'

const EMPTY: SyncResult = { points: [], located: 0, truncated: false }

/**
 * Keeps a marker layer on `map` in sync with `items` and returns the last {@linkcode SyncResult}.
 *
 * The layer is created once per map and destroyed on unmount or when the map
 * changes. `options` may be an inline object: callbacks are read from the
 * latest render, so they are not dependencies.
 *
 * The camera is left alone on purpose — when to refit (on every change, only
 * on the first load, not after the user panned) is the caller's decision.
 *
 * @example Refit on every change
 * ```tsx
 * import { applyCamera, planCamera } from '@cbcruk/naver-map-markers'
 * import { useMarkerLayer } from '@cbcruk/naver-map-markers/react'
 * import { useEffect } from 'react'
 *
 * const { points, truncated } = useMarkerLayer(map, places, {
 *   getId: (place) => place.id,
 *   getPosition: (place) => ({ lat: place.latitude, lng: place.longitude }),
 *   render: (place) => `<div class="pin">${place.name}</div>`,
 *   limit: 50,
 * })
 *
 * useEffect(() => {
 *   if (map) return applyCamera(map, planCamera(points))
 * }, [map, points])
 * ```
 */
export function useMarkerLayer<T>(
  map: naver.maps.Map | null,
  items: T[],
  options: MarkerLayerOptions<T>,
): SyncResult {
  const optionsRef = useRef(options)
  const [layer, setLayer] = useState<MarkerLayer<T> | null>(null)
  const [result, setResult] = useState<SyncResult>(EMPTY)

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (!map) return
    const next = createMarkerLayer<T>(map, {
      getId: (item) => optionsRef.current.getId(item),
      getPosition: (item) => optionsRef.current.getPosition(item),
      render: (item) => optionsRef.current.render(item),
      get anchor() {
        return optionsRef.current.anchor
      },
      get limit() {
        return optionsRef.current.limit
      },
      onClick: (item) => optionsRef.current.onClick?.(item),
    })
    setLayer(next)
    return () => {
      next.destroy()
      setLayer(null)
      setResult(EMPTY)
    }
  }, [map])

  useEffect(() => {
    if (layer) setResult(layer.sync(items))
  }, [layer, items])

  return result
}
