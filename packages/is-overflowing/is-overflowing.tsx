import { useRef, RefObject, CSSProperties } from 'react'
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
        ...styles.container,
        width: containerWidth,
        height: showVerticalDemo ? containerHeight : 'auto',
      }}
    >
      <div>
        <span style={styles.tags}>
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i}>Item{i}</span>
          ))}
        </span>
        {showVerticalDemo && (
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>Line {i + 1}</div>
            ))}
          </div>
        )}
      </div>
      <div style={styles.debug}>
        {hasHorizontalOverflow && <div>Horizontal overflow detected</div>}
        {hasVerticalOverflow && <div>Vertical overflow detected</div>}
        {!hasHorizontalOverflow && !hasVerticalOverflow && (
          <div>Content fits</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    overflow: 'hidden',
    border: '1px solid #ccc',
    padding: '8px',
  },
  tags: {
    display: 'flex',
    gap: 4,
  },
  debug: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
} as Record<'container' | 'tags' | 'debug', CSSProperties>
