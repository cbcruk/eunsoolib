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
   * Width to draw. If `height` is not set, the height is derived from the source
   * aspect ratio (the source rectangle when given, otherwise the whole image).
   * If neither is set, the source size is used.
   */
  width?: number
  /**
   * Height to draw. If `width` is not set, the width is derived from the source
   * aspect ratio (the source rectangle when given, otherwise the whole image).
   * If neither is set, the source size is used.
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
  /** Enable caching. See {@link LoadImageOptions.cache}. @default true */
  cache?: boolean
  /** AbortSignal that cancels this call. See {@link LoadImageOptions.signal}. */
  signal?: AbortSignal
}

/** Options for loading an image as an `ImageBitmap`. */
export interface LoadImageOptions {
  /**
   * Enable caching. When concurrent calls share a pending load, the bitmap is
   * cached if any call still waiting on it enabled caching. @default true
   */
  cache?: boolean
  /**
   * AbortSignal that cancels this call. When concurrent calls share a pending
   * load, it cancels only this call's wait; the load itself is aborted once
   * every waiting call has aborted.
   */
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
