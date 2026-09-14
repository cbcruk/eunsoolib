import { useEffect, useRef, useState } from 'react'

/** {@linkcode useDelayedFlag}의 시간 정책. */
export type DelayedFlagOptions = {
  /** 이 시간(ms) 이전에 끝나면 아무것도 보여주지 않는다. 깜빡임 방지. */
  delay?: number
  /** 한 번 보이면 최소 이만큼(ms) 유지한다. 스켈레톤 번쩍임 방지. */
  minDuration?: number
}

/**
 * placeholder 표시 여부를 시간 정책으로 감싼다.
 *
 * `active`가 켜져도 `delay`가 지나기 전에 꺼지면 `true`가 된 적이 없고, 한 번
 * `true`가 되면 `minDuration` 동안은 `active`가 꺼져도 유지된다. 100ms 만에
 * 돌아오는 응답에 스켈레톤이 번쩍이는 것과, 스켈레톤이 한 프레임만 스치고
 * 사라지는 것을 동시에 막는다.
 *
 * `fallback` 쪽엔 이 훅의 대응물이 없다. 실패는 즉시 확정된 사실이라 "너무 빨리
 * 실패해서 안 보여준다"가 성립하지 않기 때문이다. 지연만이 시간에 대한 정책을
 * 요구한다.
 *
 * @param active - 지연 중인지 여부. 보통 `state.phase === 'loading'`.
 * @param options - 시간 정책. 기본값은 `delay: 200`, `minDuration: 400`.
 * @returns placeholder를 렌더해야 하면 `true`.
 *
 * @example 직접 만든 로딩 표시에 적용하기
 * ```tsx
 * import { useDelayedFlag } from '@cbcruk/query-view'
 *
 * function Panel({ isPending }: { isPending: boolean }) {
 *   const visible = useDelayedFlag(isPending, { delay: 300 })
 *
 *   return visible ? <Skeleton /> : null
 * }
 * ```
 */
export function useDelayedFlag(
  active: boolean,
  { delay = 200, minDuration = 400 }: DelayedFlagOptions = {},
): boolean {
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (active) {
      if (visible) return

      const id = setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, delay)

      return () => clearTimeout(id)
    }

    if (!visible) return

    const shownAt = shownAtRef.current ?? Date.now()
    const remaining = minDuration - (Date.now() - shownAt)

    if (remaining <= 0) {
      shownAtRef.current = null
      setVisible(false)
      return
    }

    const id = setTimeout(() => {
      shownAtRef.current = null
      setVisible(false)
    }, remaining)

    return () => clearTimeout(id)
  }, [active, visible, delay, minDuration])

  return visible
}
