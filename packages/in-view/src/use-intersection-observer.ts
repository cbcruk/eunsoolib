import { useEffect, useRef } from 'react'

interface UseIntersectionObserverProps {
  onIntersect: () => void
  enabled?: boolean
  threshold?: number
}

export const useIntersectionObserver = ({
  onIntersect,
  enabled = true,
  threshold = 0.1,
}: UseIntersectionObserverProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const target = ref.current

    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersect()
        }
      },
      {
        threshold,
      }
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [enabled, onIntersect, threshold])

  return {
    ref,
  }
}
