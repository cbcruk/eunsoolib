import { useEffect, useState, type ReactNode } from 'react'

/** {@linkcode Delayed}의 props. */
export type DelayedProps = {
  /** 렌더를 미루는 시간(ms). 기본값 `200`. */
  delay?: number
  children: ReactNode
}

/**
 * `delay`가 지난 뒤에야 자식을 렌더한다. Suspense fallback의 깜빡임을 막는다.
 *
 * Suspense fallback에는 `minDuration`을 적용할 수 없다 — 데이터가 도착하면
 * React가 fallback 트리를 즉시 언마운트하므로 유지할 주체가 사라진다. 지킬 수
 * 있는 건 `delay`뿐이고, 그래서 이 컴포넌트는 {@linkcode useDelayedFlag}보다
 * 하는 일이 적다.
 *
 * @example Suspense fallback 감싸기
 * ```tsx
 * import { Delayed } from '@eunsoolib/query-view'
 *
 * <Suspense fallback={<Delayed><Skeleton /></Delayed>}>
 *   <Panel />
 * </Suspense>
 * ```
 */
export function Delayed({ delay = 200, children }: DelayedProps): ReactNode {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setShow(true), delay)

    return () => clearTimeout(id)
  }, [delay])

  return show ? children : null
}
