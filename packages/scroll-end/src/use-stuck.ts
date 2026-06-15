import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from 'react'

export interface UseStuckOptions {
  /** Distance from the top (px) at which the element counts as stuck. @default 0 */
  offset?: number
  /** Heavy callback, invoked only on `scrollend` with the latest stuck state. */
  onStuckChange?: (isStuck: boolean) => void
}

export interface UseStuckReturn {
  /** Attach to a 0px sentinel placed right above the sticky element. */
  sentinelRef: RefCallback<HTMLElement>
  /** Live stuck state, updated cheaply by IntersectionObserver. */
  isStuck: boolean
}

/**
 * Detect whether a `position: sticky` element is currently "stuck".
 *
 * Role separation: the IntersectionObserver updates a boolean cheaply during
 * scroll (no layout reads), while expensive work runs only on `scrollend`.
 */
export function useStuck({
  offset = 0,
  onStuckChange,
}: UseStuckOptions = {}): UseStuckReturn {
  const [isStuck, setIsStuck] = useState(false)
  const stuckRef = useRef(false)
  const onChangeRef = useRef(onStuckChange)
  onChangeRef.current = onStuckChange

  const sentinelRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      if (!node) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          const stuck = !entry?.isIntersecting
          stuckRef.current = stuck
          setIsStuck(stuck)
        },
        { threshold: 0, rootMargin: `-${offset}px 0px 0px 0px` },
      )
      observer.observe(node)
      return () => observer.disconnect()
    },
    [offset],
  )

  useEffect(() => {
    const onEnd = (): void => onChangeRef.current?.(stuckRef.current)
    document.addEventListener('scrollend', onEnd)
    return () => document.removeEventListener('scrollend', onEnd)
  }, [])

  return { sentinelRef, isStuck }
}
