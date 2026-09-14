import { isScrollEndSupported } from './feature-detection'

/** Options for {@link installScrollEndPolyfill}. */
export interface ScrollEndPolyfillOptions {
  /** Idle time (ms) without a scroll event before `scrollend` is dispatched. @default 100 */
  idleDelay?: number
}

/**
 * Dispatch a synthetic `scrollend` event on browsers that lack native support,
 * by detecting scroll idle. Kept as a separate entry so it never pollutes the
 * main bundle.
 *
 * Does nothing when `scrollend` is natively supported.
 *
 * @param target - Element or document to watch for `scroll` and dispatch `scrollend` on
 * @returns A cleanup function that removes the polyfill listener.
 *
 * @example
 * ```ts
 * import { installScrollEndPolyfill } from '@cbcruk/scroll-end/polyfill'
 *
 * const uninstall = installScrollEndPolyfill(document, { idleDelay: 150 })
 * ```
 */
export function installScrollEndPolyfill(
  target: Document | HTMLElement = document,
  { idleDelay = 100 }: ScrollEndPolyfillOptions = {},
): () => void {
  if (isScrollEndSupported()) {
    return () => {}
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  const onScroll = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      target.dispatchEvent(new Event('scrollend'))
    }, idleDelay)
  }

  target.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    if (timer) clearTimeout(timer)
    target.removeEventListener('scroll', onScroll)
  }
}
