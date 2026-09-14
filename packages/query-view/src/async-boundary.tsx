import {
  Suspense,
  useCallback,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { ErrorBoundary } from './error-boundary'

/** {@linkcode AsyncBoundary}의 props. */
export type AsyncBoundaryProps = {
  children: ReactNode
  /** 실패했을 때. `retry`는 하위 트리를 언마운트해 실제 재요청을 일으킨다. */
  fallback: (error: unknown, retry: () => void) => ReactNode
  /** Suspense 지연 동안. {@linkcode Delayed}로 감싸면 깜빡임을 막을 수 있다. */
  placeholder?: ReactNode
  /** 이 값들 중 하나라도 바뀌면 에러 상태를 자동으로 푼다. */
  resetKeys?: readonly unknown[]
  onError?: (error: unknown, info: ErrorInfo) => void
  /** `queryClient.resetQueries` 등 실제 재요청을 트리거하는 자리. */
  onReset?: () => void
}

/**
 * 교체 층 전담 경계. `useSuspenseQuery`와 짝을 이룬다.
 *
 * 중첩 순서는 임의가 아니다. 바깥일수록 더 근본적인 결핍이고, 안쪽 층은 바깥
 * 층이 성립해야만 의미가 있다.
 *
 * ```
 * 실패(fallback) ⊃ 지연(placeholder) ⊃ 빈 결과(empty)
 * ```
 *
 * 에러가 났으면 로딩 여부는 물을 수 없고, 로딩 중이면 결과가 비었는지 물을 수
 * 없다. `empty`가 여기 없는 것도 그래서다 — 가장 안쪽이라
 * {@linkcode SuspenseQueryView}로 내려간다.
 *
 * `retry`가 nonce를 올려 경계를 통째로 언마운트하는 이유: 에러 상태만 내려서는
 * Suspense 하위 트리가 그대로 남아 재요청이 일어나지 않는다.
 *
 * @example 라우트 경계로 쓰기
 * ```tsx
 * import { AsyncBoundary, Delayed } from '@cbcruk/query-view'
 *
 * <AsyncBoundary
 *   placeholder={<Delayed><PostSkeleton /></Delayed>}
 *   fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
 *   resetKeys={[keyword]}
 *   onReset={() => queryClient.resetQueries({ queryKey: ['posts'] })}
 * >
 *   <PostsPanel keyword={keyword} />
 * </AsyncBoundary>
 * ```
 */
export function AsyncBoundary({
  children,
  fallback,
  placeholder = null,
  resetKeys,
  onError,
  onReset,
}: AsyncBoundaryProps): ReactNode {
  const [nonce, setNonce] = useState(0)

  const retry = useCallback(() => {
    onReset?.()
    setNonce((n) => n + 1)
  }, [onReset])

  return (
    <ErrorBoundary
      key={nonce}
      fallback={(error) => fallback(error, retry)}
      resetKeys={resetKeys}
      onError={onError}
    >
      <Suspense fallback={placeholder}>{children}</Suspense>
    </ErrorBoundary>
  )
}
