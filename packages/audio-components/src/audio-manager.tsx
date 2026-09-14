import { useEffect } from 'react'
import { audioActions } from './audio-actions'

/**
 * 공유 `Audio` 엘리먼트를 만들어 `audioStore`에 연결하는 컴포넌트.
 *
 * 마운트 시 엘리먼트를 만들고 재생·시간·메타데이터·에러 이벤트를 store 상태로
 * 옮긴다. 언마운트하면 리스너를 떼고 재생을 멈춘다. 아무것도 렌더하지 않으므로
 * 앱 루트에 한 번만 둔다.
 *
 * @example
 * ```tsx
 * import { AudioManager, CastAudioPlayer } from '@cbcruk/audio-components'
 *
 * function App() {
 *   return (
 *     <>
 *       <AudioManager />
 *       <CastAudioPlayer src="/episodes/1.mp3" />
 *     </>
 *   )
 * }
 * ```
 */
export function AudioManager() {
  useEffect(() => {
    const audio = new Audio()

    audio.preload = 'metadata'

    const handlePlay = () => audioActions.setIsPlaying(true)
    const handlePause = () => audioActions.setIsPlaying(false)
    const handleEnded = () => audioActions.setIsPlaying(false)
    const handleTimeUpdate = () =>
      audioActions.setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      audioActions.setDuration(audio.duration)
      audioActions.setIsLoading(false)
    }
    const handleLoadStart = () => audioActions.setIsLoading(true)
    const handleCanPlay = () => audioActions.setIsLoading(false)
    const handleError = () => {
      audioActions.setError('오디오를 재생할 수 없습니다.')
      audioActions.setIsLoading(false)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)

    audioActions.setAudio(audio)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)

      audio.pause()
      audio.src = ''
      audio.load()
    }
  }, [])

  return null
}
