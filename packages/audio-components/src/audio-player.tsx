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
    <div className="w-full max-w-md p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="space-y-3">
        <div className="px-1">
          <AudioPlayerSlider value={progress} onChange={handleProgress} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            disabled
            className="p-2 text-gray-400 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏮
          </button>

          <button
            onClick={handlePlay}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
          >
            {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
          </button>

          <button
            disabled
            className="p-2 text-gray-400 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏭
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 min-w-[3rem] text-right">
            {formatDuration(Math.floor(currentTime))}
          </span>
          <div className="flex-1" />
          <span className="text-xs text-gray-500 min-w-[3rem]">
            {formatDuration(Math.floor(duration))}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-gray-600">🔊</span>
            <div className="w-24">
              <AudioPlayerSlider value={volume} onChange={handleVolume} />
            </div>
          </div>

          <button
            title={isLooping ? '반복 해제' : '반복'}
            onClick={toggleLoop}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              isLooping
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔁 {isLooping ? '반복' : '반복 해제'}
          </button>
        </div>
      </div>
    </div>
  )
}
