import { useEffect, useRef } from 'react'

interface UseIntersectionObserverProps {
  onIntersect: () => void
  enabled?: boolean
  threshold?: number
}

/**
 * 반환한 `ref`의 엘리먼트가 뷰포트와 교차할 때마다 `onIntersect`를 호출하는 훅.
 *
 * `enabled`가 `false`이거나 `ref`가 연결되지 않았으면 관찰하지 않는다.
 * `threshold`의 기본값은 `0.1`이다. `onIntersect`가 의존성 배열에 포함되므로
 * 매 렌더마다 새 함수를 넘기면 observer도 다시 만들어진다.
 *
 * @returns 관찰할 `div`에 연결할 `ref`
 * @example
 * ```tsx
 * import { useIntersectionObserver } from '@cbcruk/in-view'
 *
 * function Sentinel({ onLoadMore }: { onLoadMore: () => void }) {
 *   const { ref } = useIntersectionObserver({ onIntersect: onLoadMore })
 *   return <div ref={ref} />
 * }
 * ```
 */
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
      },
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [enabled, onIntersect, threshold])

  return {
    ref,
  }
}
