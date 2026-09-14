import { useEffect, useRef, type RefObject } from 'react'

/** Options for {@link useScrollEnd}. */
export interface UseScrollEndOptions {
  /**
   * Scroll container to observe: `'document'`, a ref, or the element itself.
   *
   * A ref is re-read after every render of the calling component, so an
   * element that mounts later or is swapped for another node is picked up on
   * the next render. When the element can change without re-rendering this
   * component, pass the element directly (e.g. kept in state through a
   * callback ref); `null` means "no element yet" and subscribes to nothing.
   *
   * @default 'document'
   */
  target?: RefObject<HTMLElement | null> | HTMLElement | null | 'document'
  /** Called when the browser finishes a scroll on the target. */
  onScrollEnd: (event: Event) => void
  /** Whether the subscription is active; set `false` to pause it without unmounting. @default true */
  enabled?: boolean
}

function resolveTarget(
  target: UseScrollEndOptions['target'],
): EventTarget | null {
  if (target === 'document') return document
  if (!target) return null
  return 'current' in target ? target.current : target
}

interface Subscription {
  element: EventTarget
  unsubscribe: () => void
}

/**
 * Subscribe to the native `scrollend` event — fired once the browser has
 * settled scrolling (after scroll-snap, after inertial scrolling), not on an
 * estimated timer.
 *
 * The handler is read through a ref so the latest closure is always used
 * without re-registering the listener (stale-closure safe). The target is
 * resolved after every commit and the listener moves only when the resolved
 * element changes, so conditionally rendered or replaced containers are
 * followed.
 *
 * @example Element kept in state
 * ```tsx
 * import { useState } from 'react'
 * import { useScrollEnd } from '@cbcruk/scroll-end'
 *
 * function Carousel({ open }: { open: boolean }) {
 *   const [el, setEl] = useState<HTMLDivElement | null>(null)
 *   useScrollEnd({ target: el, onScrollEnd: () => console.log('settled') })
 *   return open ? <div ref={setEl} /> : null
 * }
 * ```
 */
export function useScrollEnd({
  target = 'document',
  onScrollEnd,
  enabled = true,
}: UseScrollEndOptions): void {
  const handlerRef = useRef(onScrollEnd)
  handlerRef.current = onScrollEnd
  const subscriptionRef = useRef<Subscription | null>(null)

  // No dependency array: a ref's `.current` can change without the ref object
  // changing, so re-resolve on every commit and resubscribe only on change.
  useEffect(() => {
    const element = enabled ? resolveTarget(target) : null
    const current = subscriptionRef.current
    if (current?.element === element) return

    current?.unsubscribe()
    subscriptionRef.current = null
    if (!element) return

    const listener = (event: Event): void => handlerRef.current(event)
    element.addEventListener('scrollend', listener)
    subscriptionRef.current = {
      element,
      unsubscribe: () => element.removeEventListener('scrollend', listener),
    }
  })

  useEffect(
    () => () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    },
    [],
  )
}
