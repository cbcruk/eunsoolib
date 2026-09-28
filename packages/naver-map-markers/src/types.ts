/// <reference types="navermaps" />

/** A plain latitude/longitude pair, independent of the naver SDK. */
export interface LatLngLiteral {
  lat: number
  lng: number
}

/**
 * What the camera should do for a set of points, decided by {@linkcode planCamera}.
 *
 * - `keep`: no points; leave the camera where the user left it.
 * - `center`: one point; center on it at a fixed zoom.
 * - `fit`: two or more points; fit the south-west/north-east box.
 */
export type CameraPlan =
  | { type: 'keep' }
  | { type: 'center'; at: LatLngLiteral; zoom: number }
  | { type: 'fit'; sw: LatLngLiteral; ne: LatLngLiteral }

/** Options for {@linkcode planCamera}. */
export interface PlanCameraOptions {
  /** Zoom used when there is exactly one point. @default 16 */
  singleZoom?: number
  /**
   * Minimum width and height of the fitted box, in degrees.
   *
   * Two places in the same building produce a box of almost zero area; padding
   * it keeps some surrounding context on screen. `0.004` is roughly 400m.
   *
   * @default 0
   */
  minSpan?: number
}

/** Options for {@linkcode applyCamera}. */
export interface ApplyCameraOptions {
  /**
   * Pixel margin around the fitted box.
   *
   * Use it to cover what hides the map, such as a bottom sheet or a header,
   * not for looks.
   */
  margin?: naver.maps.Margin
  /** Upper bound for the zoom chosen by `fitBounds`. @default 17 */
  maxZoom?: number
}

/** Options for {@linkcode createMarkerLayer}. */
export interface MarkerLayerOptions<T> {
  /** Stable identity used to diff markers between syncs. */
  getId: (item: T) => string
  /**
   * Position of an item, or `null` when it has none.
   *
   * Non-finite values (`NaN`, `Infinity`) are skipped as well, because
   * `new naver.maps.LatLng(NaN, NaN)` does not throw.
   */
  getPosition: (item: T) => LatLngLiteral | null
  /** HTML content of the marker; the icon is replaced only when this string changes. */
  render: (item: T) => string
  /** Anchor of the HTML icon. Omit it to keep the SDK default. */
  anchor?: naver.maps.Point | naver.maps.PointLiteral
  /** Maximum number of markers, counted after items without a position are dropped. */
  limit?: number
  /** Called with the latest item when its marker is clicked. */
  onClick?: (item: T) => void
}

/** Result of {@linkcode MarkerLayer.sync}. */
export interface SyncResult {
  /** Positions of the markers now on the map, in item order. */
  points: LatLngLiteral[]
  /** Number of items that had a position, before `limit` was applied. */
  located: number
  /** Whether `limit` dropped some located items. */
  truncated: boolean
}

/** Handle returned by {@linkcode createMarkerLayer}. */
export interface MarkerLayer<T> {
  /** Reconciles markers with `items` by id: removes, moves, re-renders, or creates. */
  sync: (items: T[]) => SyncResult
  /** Returns the marker for an id, or `undefined` when it is not on the map. */
  get: (id: string) => naver.maps.Marker | undefined
  /** Removes every marker and its listeners from the map. */
  destroy: () => void
}
