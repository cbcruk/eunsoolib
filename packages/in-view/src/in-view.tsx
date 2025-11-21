import type { ComponentProps, ReactNode } from 'react'
import { useIntersectionObserver } from './use-intersection-observer'

interface InViewProps extends ComponentProps<'div'> {
  onIntersect: () => void
  enabled?: boolean
  threshold?: number
  children: ReactNode
}

/**
 * IntersectionObserver를 사용한 InView 컴포넌트
 *
 * @example
 * ```tsx
 * <InView onIntersect={() => fetchNextPage()}>
 *   <p>로딩중...</p>
 * </InView>
 * ```
 */
export function InView({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  children,
  ...props
}: InViewProps) {
  const { ref } = useIntersectionObserver({
    onIntersect,
    enabled,
    threshold,
  })

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
}
