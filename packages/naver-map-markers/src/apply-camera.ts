/// <reference types="navermaps" />
import type { ApplyCameraOptions, CameraPlan } from './types'

/**
 * Moves the map camera according to a {@linkcode CameraPlan}.
 *
 * The zoom cap is passed to `fitBounds` itself, so the map's own `maxZoom`
 * option — and the user's manual zoom — stay untouched.
 *
 * When the map element has zero width or height (a hidden tab, `display: none`,
 * a running animation), `fitBounds` would compute a wrong zoom and never
 * recompute it. In that case the plan waits for the element to get a size,
 * calls `map.refresh()`, and applies then.
 *
 * @returns A function that cancels a pending wait. It is a no-op once applied.
 *
 * @example Refit whenever the markers change
 * ```ts
 * import { applyCamera, planCamera } from '@cbcruk/naver-map-markers'
 *
 * const cancel = applyCamera(map, planCamera(points), {
 *   margin: { top: 80, right: 24, bottom: 160, left: 24 },
 *   maxZoom: 17,
 * })
 * ```
 */
export function applyCamera(
  map: naver.maps.Map,
  plan: CameraPlan,
  options: ApplyCameraOptions = {},
): () => void {
  if (plan.type === 'keep') return noop

  const element = map.getElement()
  if (hasSize(element) || typeof ResizeObserver === 'undefined') {
    move(map, plan, options)
    return noop
  }

  const observer = new ResizeObserver(() => {
    if (!hasSize(element)) return
    observer.disconnect()
    map.refresh()
    move(map, plan, options)
  })
  observer.observe(element)
  return () => observer.disconnect()
}

function move(
  map: naver.maps.Map,
  plan: Exclude<CameraPlan, { type: 'keep' }>,
  { margin, maxZoom = 17 }: ApplyCameraOptions,
): void {
  if (plan.type === 'center') {
    map.setCenter(new naver.maps.LatLng(plan.at.lat, plan.at.lng))
    map.setZoom(Math.min(plan.zoom, maxZoom))
    return
  }

  const bounds = new naver.maps.LatLngBounds(
    new naver.maps.LatLng(plan.sw.lat, plan.sw.lng),
    new naver.maps.LatLng(plan.ne.lat, plan.ne.lng),
  )
  map.fitBounds(bounds, { ...margin, maxZoom })
}

function hasSize(element: HTMLElement): boolean {
  return element.clientWidth > 0 && element.clientHeight > 0
}

function noop(): void {}
