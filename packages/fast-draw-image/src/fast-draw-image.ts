import type {
  FastDrawOptions,
  LoadImageOptions,
  PreloadOptions,
  CacheStats,
  BrowserType,
} from './types'

/** A caller waiting on a shared pending load. */
interface PendingWaiter {
  /** Whether this caller asked for the result to be cached. */
  cache: boolean
}

/** One in-flight load shared by every concurrent caller for the same URL. */
interface PendingLoad {
  /** Resolves with the bitmap once the underlying load finishes; set when the load starts. */
  promise?: Promise<ImageBitmap>
  /** Aborts the underlying load; fired once every waiter has aborted. */
  controller: AbortController
  /** Callers still waiting on this load. */
  waiters: Set<PendingWaiter>
}

function createAbortError(): DOMException {
  return new DOMException('Image loading aborted', 'AbortError')
}

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
  private pendingLoads: Map<string, PendingLoad> = new Map()
  private browserType: BrowserType

  /** Create an instance with its own cache and detect the browser type. */
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
   *
   * Concurrent calls for the same URL share one pending load, which runs on an
   * internal `AbortController`. Each call's `signal` cancels only that call's
   * wait; the shared load itself is aborted once every waiting call has aborted.
   * The result is cached if any call still waiting when the load finishes
   * passed `cache: true`.
   *
   * @throws An `AbortError` `DOMException` if this call's `signal` is aborted
   * before the image is loaded.
   */
  async loadImage(
    url: string,
    options: LoadImageOptions = {},
  ): Promise<ImageBitmap> {
    const { cache = true, signal } = options

    if (cache && this.cache.has(url)) {
      return this.cache.get(url)!
    }

    if (signal?.aborted) {
      throw createAbortError()
    }

    const pending = this.pendingLoads.get(url) ?? this.createPendingLoad(url)
    const waiter: PendingWaiter = { cache }

    pending.waiters.add(waiter)

    return new Promise<ImageBitmap>((resolve, reject) => {
      const onAbort = (): void => {
        pending.waiters.delete(waiter)
        reject(createAbortError())

        if (pending.waiters.size === 0) {
          if (this.pendingLoads.get(url) === pending) {
            this.pendingLoads.delete(url)
          }
          pending.controller.abort()
        }
      }

      // Listen before starting the load so an abort fired during start is seen.
      signal?.addEventListener('abort', onAbort, { once: true })

      this.startPendingLoad(url, pending).then(
        (bitmap) => {
          signal?.removeEventListener('abort', onAbort)
          resolve(bitmap)
        },
        (error: unknown) => {
          signal?.removeEventListener('abort', onAbort)
          reject(error)
        },
      )
    })
  }

  /**
   * Register a pending load that concurrent callers for the same URL can join.
   */
  private createPendingLoad(url: string): PendingLoad {
    const pending: PendingLoad = {
      controller: new AbortController(),
      waiters: new Set(),
    }

    this.pendingLoads.set(url, pending)

    return pending
  }

  /**
   * Start the underlying load for a pending entry once and return its promise.
   */
  private startPendingLoad(
    url: string,
    pending: PendingLoad,
  ): Promise<ImageBitmap> {
    if (pending.promise) {
      return pending.promise
    }

    const { controller, waiters } = pending

    pending.promise = this.loadImageInternal(url, controller.signal)
      .then((bitmap) => {
        if (waiters.size === 0) {
          // Every caller aborted while the bitmap was being created.
          bitmap.close()
          throw createAbortError()
        }

        if ([...waiters].some((waiter) => waiter.cache)) {
          this.cache.set(url, bitmap)
        }

        return bitmap
      })
      .finally(() => {
        if (this.pendingLoads.get(url) === pending) {
          this.pendingLoads.delete(url)
        }
      })

    // Waiters handle the rejection; avoid an unhandled rejection when none are left.
    pending.promise.catch(() => {})

    return pending.promise
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
   *
   * Without `canvas`, the image is only loaded. If only one of `width` and
   * `height` is set, the other is derived from the aspect ratio of the source
   * (the source rectangle when given, otherwise the whole image).
   *
   * @returns The loaded bitmap
   * @throws If `canvas` is an ID with no matching element, or a 2D context is unavailable.
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
        const size = resolveDrawSize(width, height, sWidth, sHeight)

        ctx.drawImage(
          bitmap,
          sx,
          sy,
          sWidth,
          sHeight,
          x,
          y,
          size?.width ?? sWidth,
          size?.height ?? sHeight,
        )
      } else if (width !== undefined || height !== undefined) {
        const size = resolveDrawSize(
          width,
          height,
          bitmap.width,
          bitmap.height,
        )!

        ctx.drawImage(bitmap, x, y, size.width, size.height)
      } else {
        ctx.drawImage(bitmap, x, y)
      }
    }

    return bitmap
  }

  /**
   * Preload multiple images with optional concurrency control.
   *
   * Failed loads are logged with `console.warn` and left out of the result.
   *
   * @returns Loaded bitmaps keyed by URL
   * @throws An `AbortError` `DOMException` if `signal` is aborted before a batch starts.
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
   *
   * @returns `true` if the URL was cached
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

/**
 * Fill in a missing destination dimension from the source aspect ratio.
 *
 * @returns `undefined` when neither `width` nor `height` is set
 */
function resolveDrawSize(
  width: number | undefined,
  height: number | undefined,
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } | undefined {
  if (width !== undefined && height !== undefined) {
    return { width, height }
  }

  if (width !== undefined) {
    return { width, height: (width * sourceHeight) / sourceWidth }
  }

  if (height !== undefined) {
    return { width: (height * sourceWidth) / sourceHeight, height }
  }

  return undefined
}

/** Shared {@link FastDrawImage} instance used by the standalone functions. */
export const fastDrawImage = new FastDrawImage()
