import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface AudioState {
  audio: HTMLAudioElement | null
  src: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  volume: number
  isLooping: boolean
  setAudio: (audio: HTMLAudioElement) => void
  play: (src: string) => Promise<void>
  togglePlay: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleLoop: () => void
  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useAudioStore = create<AudioState>()(
  devtools(
    persist(
      (set, get) => ({
        audio: null,
        src: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isLoading: false,
        error: null,
        volume: 1,
        isLooping: false,
        setAudio: (audio) => {
          set({ audio })

          audio.volume = get().volume
          audio.loop = get().isLooping
        },
        play: async (nextSrc) => {
          const { audio, src, isLoading } = get()

          if (!audio) {
            return
          }

          if (isLoading) {
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
        togglePlay: () => {
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
        pause: () => {
          const { audio } = get()

          if (!audio || audio.paused) {
            return
          }

          audio.pause()
        },
        stop: () => {
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
        seek: (time) => {
          const { audio } = get()

          if (!audio) {
            return
          }

          audio.currentTime = time
        },
        setVolume: (volume) => {
          const { audio } = get()
          const clampedVolume = Math.max(0, Math.min(1, volume))

          if (audio) {
            audio.volume = clampedVolume
          }

          set({ volume: clampedVolume })
        },
        toggleLoop: () => {
          const { audio, isLooping } = get()
          const newLoopState = !isLooping

          if (audio) {
            audio.loop = newLoopState
          }

          set({
            isLooping: newLoopState,
          })
        },
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        setCurrentTime: (currentTime) => set({ currentTime }),
        setDuration: (duration) => set({ duration }),
        setIsLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'audio-storage',
        partialize: (state) => ({
          volume: state.volume,
          isLooping: state.isLooping,
        }),
      }
    ),
    {
      name: 'AudioStore',
    }
  )
)
