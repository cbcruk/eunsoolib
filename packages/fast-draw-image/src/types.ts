/**
 * Options for loading and drawing images.
 */
export interface FastDrawOptions {
  /** Canvas element or its ID */
  canvas?: HTMLCanvasElement | string
  /** X position to draw at. @default 0 */
  x?: number
  /** Y position to draw at. @default 0 */
  y?: number
  /**
   * Width to draw. Applied only when `height` is also set, or with a full source
   * rectangle (where it falls back to `sWidth`); otherwise the image is drawn at
   * its natural size.
   */
  width?: number
  /**
   * Height to draw. Applied only when `width` is also set, or with a full source
   * rectangle (where it falls back to `sHeight`); otherwise the image is drawn at
   * its natural size.
   */
  height?: number
  /** Source rectangle x. The source rectangle is used only when `sx`, `sy`, `sWidth`, and `sHeight` are all set. */
  sx?: number
  /** Source rectangle y */
  sy?: number
  /** Source rectangle width */
  sWidth?: number
  /** Source rectangle height */
  sHeight?: number
  /** Enable caching. @default true */
  cache?: boolean
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

/** Options for loading an image as an `ImageBitmap`. */
export interface LoadImageOptions {
  /** Enable caching. @default true */
  cache?: boolean
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

/** Options for preloading multiple images. */
export interface PreloadOptions {
  /** Enable caching. @default true */
  cache?: boolean
  /** Maximum concurrent loads; URLs are loaded in batches of this size. @default 4 */
  concurrency?: number
  /** Progress callback, called after each URL settles (whether it loaded or failed). */
  onProgress?: (loaded: number, total: number) => void
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

/** Snapshot of the image cache. */
export interface CacheStats {
  /** Number of cached images */
  size: number
  /** List of cached URLs */
  urls: string[]
}

/** Browser family detected to choose the image loading strategy. */
export type BrowserType = 'chromium' | 'firefox' | 'safari' | 'unknown'
