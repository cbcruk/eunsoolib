import { AudioPlayerSlider } from './audio-player-slider'
import { formatDuration } from './format-duration'
import { useAudioStore } from './use-audio-store'

type CastAudioPlayerProps = {
  src: string
}

export function CastAudioPlayer({ src }: CastAudioPlayerProps) {
  const {
    volume,
    setVolume,
    src: currentSrc,
    isPlaying,
    currentTime,
    duration,
    play: playCast,
    togglePlay,
    isLooping,
    toggleLoop,
    seek,
  } = useAudioStore()

  const isMatchedCast = currentSrc === src
  const progress = duration > 0 ? currentTime / duration : 0

  const handlePlay = () => {
    if (isMatchedCast) {
      togglePlay()
    } else {
      playCast(src)
    }
  }

  const handleProgress = (percentage: number) => {
    const newTime = percentage * duration
    seek(newTime)
  }

  const handleVolume = (volume: number) => {
    setVolume(volume)
  }

  return (
    <div data-scope>
      <div data-part="control">
        <div data-part="progress">
          <AudioPlayerSlider value={progress} onChange={handleProgress} />
        </div>

        <button disabled>prev</button>

        <button onClick={handlePlay}>{isPlaying ? '일시정지' : '재생'}</button>

        <button disabled>next</button>

        <AudioPlayerSlider value={volume} onChange={handleVolume} />

        <span data-part="current-time">
          {formatDuration(Math.floor(currentTime))}
        </span>

        <span data-part="current-duration">
          {formatDuration(Math.floor(duration))}
        </span>

        <button title={isLooping ? '반복 해제' : '반복'} onClick={toggleLoop}>
          {isLooping ? '반복' : '반복 해제'}
        </button>
      </div>
    </div>
  )
}
