import { useEffect } from 'react'
import { audioActions } from './audio-actions'

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
