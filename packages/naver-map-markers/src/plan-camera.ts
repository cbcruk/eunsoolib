import type { CameraPlan, LatLngLiteral, PlanCameraOptions } from './types'

/**
 * Decides how the camera should frame a set of points: keep, center, or fit.
 *
 * Pure and SDK-free, so the 0 / 1 / N boundaries can be unit tested. The box
 * is built with a single min/max pass, which avoids both seeding an empty
 * `LatLngBounds` and the stack limit of `Math.min(...points)`.
 *
 * Points that cross the antimeridian (±180°) are wrapped the long way round.
 *
 * @example Fit the markers of a layer
 * ```ts
 * import { applyCamera, planCamera } from '@cbcruk/naver-map-markers'
 *
 * const { points } = layer.sync(places)
 * applyCamera(map, planCamera(points, { minSpan: 0.004 }))
 * ```
 */
export function planCamera(
  points: readonly LatLngLiteral[],
  options: PlanCameraOptions = {},
): CameraPlan {
  const { singleZoom = 16, minSpan = 0 } = options

  if (points.length === 0) return { type: 'keep' }
  if (points.length === 1) {
    return { type: 'center', at: points[0], zoom: singleZoom }
  }

  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const { lat, lng } of points) {
    if (lat < south) south = lat
    if (lat > north) north = lat
    if (lng < west) west = lng
    if (lng > east) east = lng
  }

  const latPad = Math.max(0, minSpan - (north - south)) / 2
  const lngPad = Math.max(0, minSpan - (east - west)) / 2

  return {
    type: 'fit',
    sw: { lat: south - latPad, lng: west - lngPad },
    ne: { lat: north + latPad, lng: east + lngPad },
  }
}
