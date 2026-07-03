import { audioStore, type AudioState } from './audio-store'

const set = (patch: Partial<AudioState>) =>
  audioStore.setState((state) => ({ ...state, ...patch }))

const get = () => audioStore.getState()

/**
 * 오디오 도메인 액션. core를 얇게 유지하기 위해 store 밖에서 정의하며,
 * HTMLAudioElement 부수효과와 상태 갱신을 함께 처리한다.
 */
export const audioActions = {
  setAudio(audio: HTMLAudioElement) {
    set({ audio })

    audio.volume = get().volume
    audio.loop = get().isLooping
  },

  async play(nextSrc: string) {
    const { audio, src, isLoading } = get()

    if (!audio || isLoading) {
      return
    }

    try {
      set({ isLoading: true })

      if (src === nextSrc) {
        await audio.play()
        return
      }

      set({ src: nextSrc, error: null })

      audio.src = nextSrc
      audio.load()
      await audio.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
      set({ error: '재생에 실패했습니다.', isLoading: false })
    }
  },

  togglePlay() {
    const { audio, isPlaying } = get()

    if (!audio) {
      return
    }

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((error) => {
        console.error('Play failed:', error)
        set({ error: '재생에 실패했습니다.' })
      })
    }
  },

  pause() {
    const { audio } = get()

    if (!audio || audio.paused) {
      return
    }

    audio.pause()
  },

  stop() {
    const { audio } = get()

    if (!audio) {
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.src = ''

    set({
      src: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,
    })
  },

  seek(time: number) {
    const { audio } = get()

    if (!audio) {
      return
    }

    audio.currentTime = time
  },

  setVolume(volume: number) {
    const { audio } = get()
    const clampedVolume = Math.max(0, Math.min(1, volume))

    if (audio) {
      audio.volume = clampedVolume
    }

    set({ volume: clampedVolume })
  },

  toggleLoop() {
    const { audio, isLooping } = get()
    const nextLoop = !isLooping

    if (audio) {
      audio.loop = nextLoop
    }

    set({ isLooping: nextLoop })
  },

  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
  setCurrentTime: (currentTime: number) => set({ currentTime }),
  setDuration: (duration: number) => set({ duration }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}
