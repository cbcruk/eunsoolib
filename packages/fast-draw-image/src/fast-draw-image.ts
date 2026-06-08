import type {
  FastDrawOptions,
  LoadImageOptions,
  PreloadOptions,
  CacheStats,
  BrowserType,
} from './types'

/**
 * Non-blocking cross-browser image rendering library for Canvas.
 *
 * Different browsers require different approaches to avoid main thread blocking:
 * - Chromium: fetch → blob → createImageBitmap
 * - Firefox/Safari: Image.decode() → createImageBitmap
 *
 * @see https://calendar.perfplanet.com/2025/non-blocking-image-canvas/
 */
export class FastDrawImage {
  private cache: Map<string, ImageBitmap> = new Map()
  private pendingLoads: Map<string, Promise<ImageBitmap>> = new Map()
  private browserType: BrowserType

  constructor() {
    this.browserType = this.detectBrowser()
  }

  /**
   * Detect browser type to determine the optimal loading strategy.
   */
  private detectBrowser(): BrowserType {
    if (typeof window === 'undefined') return 'unknown'

    if ('chrome' in window) return 'chromium'

    const ua = navigator.userAgent

    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari'

    if (/Firefox/.test(ua)) return 'firefox'

    return 'unknown'
  }

  /**
   * Get the detected browser type.
   */
  getBrowserType(): BrowserType {
    return this.browserType
  }

  /**
   * Load an image as ImageBitmap without blocking the main thread.
   * Uses a browser-specific strategy for optimal performance.
   */
  async loadImage(
    url: string,
    options: LoadImageOptions = {},
  ): Promise<ImageBitmap> {
    const { cache = true, signal } = options

    if (cache && this.cache.has(url)) {
      return this.cache.get(url)!
    }

    if (this.pendingLoads.has(url)) {
      return this.pendingLoads.get(url)!
    }

    const loadPromise = this.loadImageInternal(url, signal)
    this.pendingLoads.set(url, loadPromise)

    try {
      const bitmap = await loadPromise

      if (cache) {
        this.cache.set(url, bitmap)
      }

      return bitmap
    } finally {
      this.pendingLoads.delete(url)
    }
  }

  private async loadImageInternal(
    url: string,
    signal?: AbortSignal,
  ): Promise<ImageBitmap> {
    if (this.browserType === 'chromium') {
      return this.loadViaBlob(url, signal)
    }

    return this.loadViaDecode(url, signal)
  }

  /**
   * Chromium-optimized loading: fetch → blob → createImageBitmap.
   */
  private async loadViaBlob(
    url: string,
    signal?: AbortSignal,
  ): Promise<ImageBitmap> {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      )
    }

    const blob = await response.blob()

    if (signal?.aborted) {
      throw new DOMException('Image loading aborted', 'AbortError')
    }

    return createImageBitmap(blob)
  }

  /**
   * Firefox/Safari-optimized loading: Image.decode() → createImageBitmap.
   */
  private async loadViaDecode(
    url: string,
    signal?: AbortSignal,
  ): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.crossOrigin = 'anonymous'

      const abortHandler = (): void => {
        image.src = ''
        reject(new DOMException('Image loading aborted', 'AbortError'))
      }

      if (signal) {
        if (signal.aborted) {
          reject(new DOMException('Image loading aborted', 'AbortError'))
          return
        }
        signal.addEventListener('abort', abortHandler)
      }

      image.onload = async (): Promise<void> => {
        signal?.removeEventListener('abort', abortHandler)

        try {
          await image.decode()

          if (signal?.aborted) {
            reject(new DOMException('Image loading aborted', 'AbortError'))
            return
          }

          const bitmap = await createImageBitmap(image)
          resolve(bitmap)
        } catch (error) {
          reject(error)
        }
      }

      image.onerror = (): void => {
        signal?.removeEventListener('abort', abortHandler)
        reject(new Error(`Failed to load image: ${url}`))
      }

      image.src = url
    })
  }

  /**
   * Load an image and draw it directly to a canvas without blocking the main thread.
   */
  async drawImage(
    url: string,
    options: FastDrawOptions = {},
  ): Promise<ImageBitmap> {
    const {
      canvas,
      x = 0,
      y = 0,
      width,
      height,
      sx,
      sy,
      sWidth,
      sHeight,
      cache = true,
      signal,
    } = options

    const bitmap = await this.loadImage(url, { cache, signal })

    if (canvas) {
      const canvasEl =
        typeof canvas === 'string'
          ? (document.getElementById(canvas) as HTMLCanvasElement | null)
          : canvas

      if (!canvasEl) {
        throw new Error(`Canvas element not found: ${canvas}`)
      }

      const ctx = canvasEl.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from canvas')
      }

      if (
        sx !== undefined &&
        sy !== undefined &&
        sWidth !== undefined &&
        sHeight !== undefined
      ) {
        ctx.drawImage(
          bitmap,
          sx,
          sy,
          sWidth,
          sHeight,
          x,
          y,
          width ?? sWidth,
          height ?? sHeight,
        )
      } else if (width !== undefined && height !== undefined) {
        ctx.drawImage(bitmap, x, y, width, height)
      } else {
        ctx.drawImage(bitmap, x, y)
      }
    }

    return bitmap
  }

  /**
   * Preload multiple images with optional concurrency control.
   */
  async preload(
    urls: string[],
    options: PreloadOptions = {},
  ): Promise<Map<string, ImageBitmap>> {
    const { cache = true, concurrency = 4, onProgress, signal } = options

    const results = new Map<string, ImageBitmap>()
    let loaded = 0

    const chunks = this.chunk(urls, concurrency)

    for (const chunk of chunks) {
      if (signal?.aborted) {
        throw new DOMException('Preload aborted', 'AbortError')
      }

      const promises = chunk.map(async (url) => {
        try {
          const bitmap = await this.loadImage(url, { cache, signal })
          results.set(url, bitmap)
        } catch (error) {
          console.warn(`Failed to preload: ${url}`, error)
        } finally {
          loaded++
          onProgress?.(loaded, urls.length)
        }
      })

      await Promise.all(promises)
    }

    return results
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Remove a single image from the cache and release its bitmap.
   */
  clearCache(url: string): boolean {
    const bitmap = this.cache.get(url)
    if (bitmap) {
      bitmap.close()
      this.cache.delete(url)
      return true
    }
    return false
  }

  /**
   * Remove all cached images and release their bitmaps.
   */
  clearAllCache(): void {
    for (const bitmap of this.cache.values()) {
      bitmap.close()
    }
    this.cache.clear()
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      urls: Array.from(this.cache.keys()),
    }
  }

  /**
   * Check whether a URL is cached.
   */
  isCached(url: string): boolean {
    return this.cache.has(url)
  }

  /**
   * Get a cached ImageBitmap (returns undefined if not cached).
   */
  getCached(url: string): ImageBitmap | undefined {
    return this.cache.get(url)
  }
}

export const fastDrawImage = new FastDrawImage()
