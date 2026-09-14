import { useCallback } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import {
  useIntersectionObserver,
  type UseIntersectionObserverProps,
} from './use-intersection-observer'

/** {@link InView}의 props. 나머지 `<div>` props는 렌더링되는 `<div>`로 전달된다. */
export interface InViewProps
  extends ComponentProps<'div'>, UseIntersectionObserverProps {
  /** `<div>` 안에 렌더링할 내용. */
  children: ReactNode
}

/**
 * 렌더링한 `<div>`가 교차 상태가 될 때마다 `onIntersect`를 호출하는 컴포넌트.
 *
 * `ref`를 넘기면 관찰 대상 `<div>`가 함께 연결된다(객체 ref와 콜백 ref 모두 지원).
 *
 * @example
 * ```tsx
 * import { InView } from '@cbcruk/in-view'
 *
 * <InView onIntersect={() => fetchNextPage()} rootMargin="200px 0px">
 *   <p>로딩중...</p>
 * </InView>
 * ```
 */
export function InView({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  root = null,
  rootMargin = '0px',
  children,
  ref: userRef,
  ...props
}: InViewProps) {
  const { ref } = useIntersectionObserver<HTMLDivElement>({
    onIntersect,
    enabled,
    threshold,
    root,
    rootMargin,
  })

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node

      if (typeof userRef === 'function') {
        const cleanup = userRef(node)

        return () => {
          ref.current = null

          if (typeof cleanup === 'function') {
            cleanup()
          } else {
            userRef(null)
          }
        }
      }

      if (userRef) {
        userRef.current = node
      }

      return () => {
        ref.current = null

        if (userRef) {
          userRef.current = null
        }
      }
    },
    [ref, userRef],
  )

  return (
    <div {...props} ref={mergedRef}>
      {children}
    </div>
  )
}
