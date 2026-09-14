import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'

type CastAudioPlayerSliderProps = {
  /** 채워진 비율. `0`–`1`. */
  value: number
  /** 드래그한 위치를 `0`–`1` 비율로 받는다. */
  onChange: (value: number) => void
}

/**
 * 가로 드래그로 `0`–`1` 값을 고르는 슬라이더.
 *
 * 스타일은 없고 `data-scope`, `data-part="rail" | "track" | "handle"` 속성만
 * 붙인다. `track`의 너비와 `handle`의 `left`가 `value`에 맞춰 퍼센트로 설정된다.
 */
export function AudioPlayerSlider({
  value,
  onChange,
}: CastAudioPlayerSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)

  const bind = useDrag(
    ({ xy: [x] }) => {
      const slider = sliderRef.current

      if (!slider) {
        return
      }

      const rect = slider.getBoundingClientRect()
      const relativeX = x - rect.left
      const percentage = Math.max(0, Math.min(1, relativeX / rect.width))

      onChange(percentage)
    },
    {
      filterTaps: true,
      axis: 'x',
    },
  )

  const percentage = value * 100

  return (
    <div ref={sliderRef} {...bind()} data-scope style={{ touchAction: 'none' }}>
      <div data-part="rail" />
      <div data-part="track" style={{ width: `${percentage}%` }} />
      <div data-part="handle" style={{ left: `${percentage}%` }} />
    </div>
  )
}
