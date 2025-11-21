import { useRef, RefObject } from 'react'
import { useSize } from 'ahooks'

export type OverflowDetection<T extends HTMLElement = HTMLElement> = {
  hasHorizontalOverflow: boolean
  hasVerticalOverflow: boolean
  ref: RefObject<T | null>
}

export function useOverflowDetection<
  T extends HTMLElement = HTMLDivElement
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

export type OverflowDemoProps = {
  containerWidth?: number
  containerHeight?: number
  showVerticalDemo?: boolean
}

export function OverflowDemo({
  containerWidth = 100,
  containerHeight = 60,
  showVerticalDemo = false,
}: OverflowDemoProps = {}) {
  const { hasHorizontalOverflow, hasVerticalOverflow, ref } =
    useOverflowDetection<HTMLDivElement>()

  return (
    <div
      ref={ref}
      style={{
        width: containerWidth,
        height: showVerticalDemo ? containerHeight : 'auto',
      }}
      className="overflow-hidden border border-gray-300 p-2 rounded bg-white"
    >
      <div>
        <span className="flex gap-1 flex-wrap">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
            >
              Item{i}
            </span>
          ))}
        </span>
        {showVerticalDemo && (
          <div className="mt-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="text-sm py-1">
                Line {i + 1}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-600 font-medium">
        {hasHorizontalOverflow && (
          <div className="text-orange-600">⚠️ Horizontal overflow detected</div>
        )}
        {hasVerticalOverflow && (
          <div className="text-orange-600">⚠️ Vertical overflow detected</div>
        )}
        {!hasHorizontalOverflow && !hasVerticalOverflow && (
          <div className="text-green-600">✓ Content fits</div>
        )}
      </div>
    </div>
  )
}
