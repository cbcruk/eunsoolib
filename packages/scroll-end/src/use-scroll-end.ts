import { useEffect, useRef, type RefObject } from 'react'

/** Options for {@link useScrollEnd}. */
export interface UseScrollEndOptions {
  /** Scroll container to observe. @default 'document' */
  target?: RefObject<HTMLElement | null> | 'document'
  /** Called when the browser finishes a scroll on the target. */
  onScrollEnd: (event: Event) => void
  /** Whether the subscription is active; set `false` to pause it without unmounting. @default true */
  enabled?: boolean
}

/**
 * Subscribe to the native `scrollend` event — fired once the browser has
 * settled scrolling (after scroll-snap, after inertial scrolling), not on an
 * estimated timer.
 *
 * The handler is read through a ref so the latest closure is always used
 * without re-registering the listener (stale-closure safe).
 */
export function useScrollEnd({
  target = 'document',
  onScrollEnd,
  enabled = true,
}: UseScrollEndOptions): void {
  const handlerRef = useRef(onScrollEnd)
  handlerRef.current = onScrollEnd

  useEffect(() => {
    if (!enabled) return

    const element: EventTarget | null =
      target === 'document' ? document : (target?.current ?? null)
    if (!element) return

    const listener = (event: Event): void => handlerRef.current(event)
    element.addEventListener('scrollend', listener)
    return () => element.removeEventListener('scrollend', listener)
  }, [enabled, target])
}
