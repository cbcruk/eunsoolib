import { useOverflowDetection } from './is-overflowing'

/** {@link OverflowDemo}의 표시 옵션 */
export type OverflowDemoProps = {
  /** 컨테이너 가로 크기(px). 기본값 `100` */
  containerWidth?: number
  /** 컨테이너 세로 크기(px). `showVerticalDemo`가 `true`일 때만 적용. 기본값 `60` */
  containerHeight?: number
  /** 세로 오버플로우를 확인할 수 있도록 줄 목록을 추가로 렌더링할지. 기본값 `false` */
  showVerticalDemo?: boolean
}

/**
 * {@link useOverflowDetection} 동작을 확인하는 데모 컴포넌트
 *
 * 고정 크기 컨테이너에 넘치는 내용을 렌더링하고, 감지된 오버플로우 방향을
 * 함께 표시한다.
 *
 * @example
 * ```tsx
 * <OverflowDemo containerWidth={200} showVerticalDemo />
 * ```
 */
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
