import { fastDrawImage } from './fast-draw-image'

export { FastDrawImage, fastDrawImage } from './fast-draw-image'
export type {
  FastDrawOptions,
  LoadImageOptions,
  PreloadOptions,
  CacheStats,
  BrowserType,
} from './types'

/**
 * Load an image as ImageBitmap without blocking the main thread.
 *
 * @example
 * const bitmap = await loadImage('https://example.com/image.jpg');
 */
export const loadImage = fastDrawImage.loadImage.bind(fastDrawImage)

/**
 * Load and draw an image to a canvas without blocking the main thread.
 *
 * @example
 * await drawImage('image.jpg', { canvas: 'myCanvas', x: 10, y: 20 });
 */
export const drawImage = fastDrawImage.drawImage.bind(fastDrawImage)

/**
 * Preload multiple images with concurrency control.
 *
 * @example
 * const images = await preload(['a.jpg', 'b.jpg'], {
 *   concurrency: 2,
 *   onProgress: (loaded, total) => console.log(`${loaded}/${total}`),
 * });
 */
export const preload = fastDrawImage.preload.bind(fastDrawImage)

/**
 * Get the detected browser type (chromium, firefox, safari, unknown).
 */
export const getBrowserType = fastDrawImage.getBrowserType.bind(fastDrawImage)

/**
 * Remove an image from the cache.
 */
export const clearCache = fastDrawImage.clearCache.bind(fastDrawImage)

/**
 * Remove all cached images.
 */
export const clearAllCache = fastDrawImage.clearAllCache.bind(fastDrawImage)

/**
 * Get cache statistics.
 */
export const getCacheStats = fastDrawImage.getCacheStats.bind(fastDrawImage)
