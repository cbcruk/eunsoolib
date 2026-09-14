import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * 오버플로우 감지 결과
 *
 * @template T - 감지 대상 엘리먼트 타입
 */
export type OverflowDetection<T extends HTMLElement = HTMLDivElement> = {
  /** 가로 방향으로 내용이 넘치는지 (`scrollWidth > clientWidth`) */
  hasHorizontalOverflow: boolean
  /** 세로 방향으로 내용이 넘치는지 (`scrollHeight > clientHeight`) */
  hasVerticalOverflow: boolean
  /** 감지할 엘리먼트에 연결할 ref */
  ref: RefObject<T | null>
}

type OverflowState = Pick<
  OverflowDetection,
  'hasHorizontalOverflow' | 'hasVerticalOverflow'
>

const NO_OVERFLOW: OverflowState = {
  hasHorizontalOverflow: false,
  hasVerticalOverflow: false,
}

function measure(element: HTMLElement): OverflowState {
  return {
    hasHorizontalOverflow: element.scrollWidth > element.clientWidth,
    hasVerticalOverflow: element.scrollHeight > element.clientHeight,
  }
}

/**
 * 엘리먼트의 내용이 넘치는지 감지하는 훅
 *
 * 반환된 `ref`를 대상 엘리먼트에 연결하면 커밋 직후(페인트 전)에 한 번 측정하고,
 * 이후 대상과 직계 자식의 크기 변화(`ResizeObserver`)와 하위 내용 변화
 * (`MutationObserver`)가 있을 때마다 다시 측정해 state로 보관한다.
 * 말줄임 처리된 텍스트에 툴팁을 붙일지 판단할 때처럼 "잘렸는지" 알아야 하는 경우에 쓴다.
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
  const [element, setElement] = useState<T | null>(null)
  const [overflow, setOverflow] = useState<OverflowState>(NO_OVERFLOW)

  useLayoutEffect(() => {
    if (ref.current !== element) {
      setElement(ref.current)
    }
  })

  useLayoutEffect(() => {
    if (!element) {
      setOverflow(NO_OVERFLOW)
      return
    }

    const update = () => {
      const next = measure(element)

      setOverflow((prev) =>
        prev.hasHorizontalOverflow === next.hasHorizontalOverflow &&
        prev.hasVerticalOverflow === next.hasVerticalOverflow
          ? prev
          : next,
      )
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)

    const observeSizes = () => {
      if (!resizeObserver) {
        return
      }

      resizeObserver.disconnect()
      resizeObserver.observe(element)

      for (const child of Array.from(element.children)) {
        resizeObserver.observe(child)
      }
    }

    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeSizes()
            update()
          })

    update()
    observeSizes()
    mutationObserver?.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [element])

  return {
    hasHorizontalOverflow: overflow.hasHorizontalOverflow,
    hasVerticalOverflow: overflow.hasVerticalOverflow,
    ref,
  }
}
