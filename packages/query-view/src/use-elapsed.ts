import { useEffect, useState } from 'react'

/**
 * `active`가 켜진 뒤 흐른 시간(ms)을 `tick` 간격으로 갱신한다.
 *
 * "응답이 늦어지고 있습니다" 같은 단계적 문구를 위한 훅이다. 정적 스켈레톤에
 * 주기적 리렌더 비용을 물릴 이유가 없으므로, {@linkcode QueryView}는 `placeholder`가
 * 함수 슬롯일 때만 이 훅을 켠다.
 *
 * @param active - 시간을 재는 중인지 여부.
 * @param tick - 갱신 간격(ms). 기본값 `1000`.
 * @returns `active`가 켜진 시점부터 흐른 시간(ms). 꺼져 있으면 `0`.
 *
 * @example 지연 단계에 따라 문구 바꾸기
 * ```tsx
 * import { useElapsed } from '@cbcruk/query-view'
 *
 * function Waiting({ pending }: { pending: boolean }) {
 *   const elapsed = useElapsed(pending)
 *
 *   return <p>{elapsed > 5000 ? '응답이 늦어지고 있습니다' : '불러오는 중'}</p>
 * }
 * ```
 */
export function useElapsed(active: boolean, tick = 1000): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return
    }

    const startedAt = Date.now()
    setElapsed(0)

    const id = setInterval(() => setElapsed(Date.now() - startedAt), tick)

    return () => clearInterval(id)
  }, [active, tick])

  return elapsed
}
