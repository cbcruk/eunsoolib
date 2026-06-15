import { isScrollEndSupported } from './feature-detection'

export interface ScrollEndPolyfillOptions {
  /** Idle time (ms) without a scroll event before `scrollend` is dispatched. @default 100 */
  idleDelay?: number
}

/**
 * Dispatch a synthetic `scrollend` event on browsers that lack native support,
 * by detecting scroll idle. Kept as a separate entry so it never pollutes the
 * main bundle.
 *
 * @returns A cleanup function that removes the polyfill listener.
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
