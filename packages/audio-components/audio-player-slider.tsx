import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'

type CastAudioPlayerSliderProps = {
  value: number
  onChange: (value: number) => void
}

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
    }
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
