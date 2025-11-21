import { useEffect } from 'react'
import { useAudioStore } from './use-audio-store'

export function AudioManager() {
  const setAudio = useAudioStore((state) => state.setAudio)
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying)
  const setCurrentTime = useAudioStore((state) => state.setCurrentTime)
  const setDuration = useAudioStore((state) => state.setDuration)
  const setIsLoading = useAudioStore((state) => state.setIsLoading)
  const setError = useAudioStore((state) => state.setError)

  useEffect(() => {
    const audio = new Audio()

    audio.preload = 'metadata'

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      setError('오디오를 재생할 수 없습니다.')
      setIsLoading(false)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)

    setAudio(audio)

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
  }, [
    setAudio,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setIsLoading,
    setError,
  ])

  return null
}
