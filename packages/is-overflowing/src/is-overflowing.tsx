import { useRef, RefObject } from 'react'
import { useSize } from 'ahooks'

/**
 * 오버플로우 감지 결과
 *
 * @template T - 감지 대상 엘리먼트 타입
 */
export type OverflowDetection<T extends HTMLElement = HTMLElement> = {
  /** 가로 방향으로 내용이 넘치는지 (`scrollWidth > clientWidth`) */
  hasHorizontalOverflow: boolean
  /** 세로 방향으로 내용이 넘치는지 (`scrollHeight > clientHeight`) */
  hasVerticalOverflow: boolean
  /** 감지할 엘리먼트에 연결할 ref */
  ref: RefObject<T | null>
}

/**
 * 엘리먼트의 내용이 넘치는지 감지하는 훅
 *
 * 반환된 `ref`를 대상 엘리먼트에 연결하면 크기 변화를 관찰해 가로/세로
 * 오버플로우 여부를 다시 계산한다. 말줄임 처리된 텍스트에 툴팁을 붙일지
 * 판단할 때처럼 "잘렸는지" 알아야 하는 경우에 쓴다.
 *
 * @template T - 감지 대상 엘리먼트 타입. 기본값 `HTMLDivElement`
 * @returns 오버플로우 여부와 연결할 `ref`
 * @example
 * ```tsx
 * import { useOverflowDetection } from '@cbcruk/is-overflowing'
 *
 * const { ref, hasHorizontalOverflow } = useOverflowDetection<HTMLDivElement>()
 *
 * return (
 *   <div ref={ref} className="truncate" title={hasHorizontalOverflow ? text : undefined}>
 *     {text}
 *   </div>
 * )
 * ```
 */
export function useOverflowDetection<
  T extends HTMLElement = HTMLDivElement,
>(): OverflowDetection<T> {
  const ref = useRef<T>(null)
  const scrollWidth = ref.current?.scrollWidth ?? 0
  const scrollHeight = ref.current?.scrollHeight ?? 0
  const clientWidth = ref.current?.clientWidth ?? 0
  const clientHeight = ref.current?.clientHeight ?? 0

  useSize(ref)

  const hasHorizontalOverflow = scrollWidth > clientWidth
  const hasVerticalOverflow = scrollHeight > clientHeight

  return {
    hasHorizontalOverflow,
    hasVerticalOverflow,
    ref,
  }
}
