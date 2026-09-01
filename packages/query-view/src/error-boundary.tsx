import { Component, type ErrorInfo, type ReactNode } from 'react'

/** {@linkcode ErrorBoundary}의 props. */
export type ErrorBoundaryProps = {
  children: ReactNode
  /** `QueryView`의 `fallback`과 같은 시그니처 앞부분: `(error, retry) => ReactNode`. */
  fallback: (error: unknown, retry: () => void) => ReactNode
  /** 이 값들 중 하나라도 바뀌면 자동 리셋한다. 라우트/필터 변경에 쓴다. */
  resetKeys?: readonly unknown[]
  onError?: (error: unknown, info: ErrorInfo) => void
  /** 리셋 직전에 불린다. `queryClient.resetQueries` 등을 여기서 호출한다. */
  onReset?: () => void
}

/** {@linkcode ErrorBoundary}의 내부 상태. */
type ErrorBoundaryState = {
  hasError: boolean
  error: unknown
}

function keysChanged(
  prev: readonly unknown[] = [],
  next: readonly unknown[] = [],
): boolean {
  return (
    prev.length !== next.length ||
    prev.some((value, index) => !Object.is(value, next[index]))
  )
}

/**
 * 에러를 잡아 `fallback`으로 갈아 끼우고, 실제로 동작하는 리셋 경로를 준다.
 *
 * `fallback`에 `retry`를 넘겨놓고 리셋 경로를 만들지 않는 게 흔한 미완성이다.
 * 에러 경계는 에러 상태를 유지하므로, 상태를 내리거나 subtree를 언마운트하지
 * 않으면 재시도 버튼은 아무 일도 하지 않는다.
 *
 * `useSuspenseQuery`와 함께 쓴다면 이 컴포넌트 대신 {@linkcode AsyncBoundary}를
 * 쓴다 — 상태를 내리는 것만으로는 Suspense 하위 트리가 재요청하지 않는다.
 *
 * @example 라우트가 바뀌면 자동 리셋
 * ```tsx
 * import { ErrorBoundary } from '@eunsoolib/query-view'
 *
 * <ErrorBoundary
 *   resetKeys={[pathname]}
 *   fallback={(error, retry) => <ErrorPanel error={error} onRetry={retry} />}
 * >
 *   <Page />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  /** 자식이 던진 에러를 상태로 옮긴다. */
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /** 잡은 에러를 `onError`로 보고한다. */
  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  /** `resetKeys`가 바뀌었으면 에러 상태를 푼다. */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return
    if (keysChanged(prevProps.resetKeys, this.props.resetKeys)) this.reset()
  }

  /** 에러 상태를 풀고 자식을 다시 렌더한다. `fallback`에 넘어가는 `retry`가 이것이다. */
  reset = (): void => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    return this.state.hasError
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children
  }
}
