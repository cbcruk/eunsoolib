import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** {@link useIntersectionObserver}의 옵션. */
export interface UseIntersectionObserverProps {
  /**
   * 대상이 교차 상태가 됐을 때 호출할 함수.
   *
   * 최신 참조를 내부 ref에 보관하므로 렌더링마다 새 함수를 넘겨도 observer를 다시 만들지 않는다.
   */
  onIntersect: () => void
  /** `false`면 관찰하지 않는다. @default true */
  enabled?: boolean
  /** `IntersectionObserver`의 `threshold`(0~1). @default 0.1 */
  threshold?: number
  /** 교차 판정 기준 엘리먼트. `null`이나 생략 시 뷰포트 기준. @default null */
  root?: Element | Document | null
  /** 기준 영역의 여백(CSS `margin` 문법, 예: `'200px 0px'`). @default '0px' */
  rootMargin?: string
}

/**
 * 반환한 `ref`의 엘리먼트가 교차 상태가 될 때마다 `onIntersect`를 호출하는 훅.
 *
 * `enabled`가 `false`이거나 `ref`가 연결되지 않았으면 관찰하지 않는다.
 * observer는 `enabled`, `threshold`, `root`, `rootMargin`이 바뀔 때만 다시 만들어지며,
 * `onIntersect`는 항상 최신 함수가 호출된다.
 *
 * @template T - 관찰할 엘리먼트 타입
 * @returns 관찰할 엘리먼트에 연결할 `ref`
 * @example
 * ```tsx
 * import { useIntersectionObserver } from '@cbcruk/in-view'
 *
 * function Sentinel({ onLoadMore }: { onLoadMore: () => void }) {
 *   const { ref } = useIntersectionObserver({ onIntersect: () => onLoadMore() })
 *   return <div ref={ref} />
 * }
 * ```
 * @example 스크롤 컨테이너 기준
 * ```tsx
 * import { useIntersectionObserver } from '@cbcruk/in-view'
 *
 * function Row({ container }: { container: HTMLElement | null }) {
 *   const { ref } = useIntersectionObserver<HTMLLIElement>({
 *     onIntersect: () => console.log('visible'),
 *     root: container,
 *     rootMargin: '100px 0px',
 *   })
 *   return <li ref={ref} />
 * }
 * ```
 */
export const useIntersectionObserver = <T extends Element = HTMLDivElement>({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  root = null,
  rootMargin = '0px',
}: UseIntersectionObserverProps): { ref: RefObject<T | null> } => {
  const ref = useRef<T>(null)
  const handlerRef = useRef(onIntersect)

  useLayoutEffect(() => {
    handlerRef.current = onIntersect
  })

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
        if (entries.some((entry) => entry.isIntersecting)) {
          handlerRef.current()
        }
      },
      {
        root,
        rootMargin,
        threshold,
      },
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [enabled, threshold, root, rootMargin])

  return {
    ref,
  }
}
