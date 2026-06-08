/**
 * Options for loading and drawing images.
 */
export interface FastDrawOptions {
  /** Canvas element or its ID */
  canvas?: HTMLCanvasElement | string
  /** X position to draw at (default: 0) */
  x?: number
  /** Y position to draw at (default: 0) */
  y?: number
  /** Width to draw (default: image's natural width) */
  width?: number
  /** Height to draw (default: image's natural height) */
  height?: number
  /** Source rectangle x */
  sx?: number
  /** Source rectangle y */
  sy?: number
  /** Source rectangle width */
  sWidth?: number
  /** Source rectangle height */
  sHeight?: number
  /** Enable caching (default: true) */
  cache?: boolean
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

export interface LoadImageOptions {
  /** Enable caching (default: true) */
  cache?: boolean
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

export interface PreloadOptions {
  /** Enable caching (default: true) */
  cache?: boolean
  /** Maximum concurrent loads (default: 4) */
  concurrency?: number
  /** Progress callback */
  onProgress?: (loaded: number, total: number) => void
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

export interface CacheStats {
  /** Number of cached images */
  size: number
  /** List of cached URLs */
  urls: string[]
}

export type BrowserType = 'chromium' | 'firefox' | 'safari' | 'unknown'
