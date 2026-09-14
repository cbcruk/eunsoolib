import { useEffect } from 'react'
import { audioActions } from './audio-actions'
import { audioStore } from './audio-store'

/**
 * 공유 `Audio` 엘리먼트를 만들어 `audioStore`에 연결하는 컴포넌트.
 *
 * 마운트 시 엘리먼트를 만들고 재생·시간·메타데이터·에러 이벤트를 store 상태로
 * 옮긴다. 소스가 없을 때(`stop()` 직후 등) 발생한 `error` 이벤트는 무시한다.
 * 언마운트하면 리스너를 떼고 재생을 멈춘 뒤 store에서 엘리먼트 등록을 해제하고
 * 재생 상태를 초기화한다. 아무것도 렌더하지 않으므로 앱 루트에 한 번만 둔다.
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
      if (!audioStore.getState().src) {
        return
      }

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
      audio.removeAttribute('src')
      audio.load()

      if (audioStore.getState().audio === audio) {
        audioActions.setAudio(null)
      }
    }
  }, [])

  return null
}
