import { audioStore, type AudioState } from './audio-store'

const set = (patch: Partial<AudioState>) =>
  audioStore.setState((state) => ({ ...state, ...patch }))

const get = () => audioStore.getState()

const PLAYBACK_RESET: Pick<
  AudioState,
  'src' | 'isPlaying' | 'currentTime' | 'duration' | 'isLoading' | 'error'
> = {
  src: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
}

/** `pause()`·소스 교체로 `play()`가 중단된 경우. 사용자에게 보여줄 실패가 아니다. */
const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

/**
 * 오디오 도메인 액션. core를 얇게 유지하기 위해 store 밖에서 정의하며,
 * HTMLAudioElement 부수효과와 상태 갱신을 함께 처리한다.
 *
 * 재생 관련 액션은 `AudioManager`가 오디오 엘리먼트를 등록하기 전에는 아무것도 하지 않는다.
 */
export const audioActions = {
  /**
   * 오디오 엘리먼트를 등록하고 저장된 `volume` / `isLooping`을 반영한다.
   *
   * `null`을 넘기면 등록을 해제하고 `src`·재생 위치·길이·로딩·에러 상태를 초기화한다.
   */
  setAudio(audio: HTMLAudioElement | null) {
    if (!audio) {
      set({ audio: null, ...PLAYBACK_RESET })
      return
    }

    set({ audio })

    audio.volume = get().volume
    audio.loop = get().isLooping
  },

  /**
   * `nextSrc`가 현재 `src`와 다르면 소스를 교체해 재생하고, 같으면 이어서 재생한다.
   *
   * 로딩 중이면 무시한다. `isLoading`은 재생이 시작되거나 실패하면 해제된다.
   * 재생 실패 시 `error`에 메시지를 넣지만, `pause()`·`stop()`으로 중단된 경우는 무시한다.
   */
  async play(nextSrc: string) {
    const { audio, src, isLoading } = get()

    if (!audio || isLoading) {
      return
    }

    try {
      set({ isLoading: true })

      if (src !== nextSrc) {
        set({ src: nextSrc, error: null })

        audio.src = nextSrc
        audio.load()
      }

      await audio.play()
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Failed to play audio:', error)
        set({ error: '재생에 실패했습니다.' })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  /** 재생 중이면 일시정지하고, 아니면 현재 `src`를 이어서 재생한다. `src`가 없으면 무시한다. */
  togglePlay() {
    const { audio, isPlaying, src } = get()

    if (!audio) {
      return
    }

    if (isPlaying) {
      audio.pause()
      return
    }

    if (!src) {
      return
    }

    audio.play().catch((error) => {
      if (isAbortError(error)) {
        return
      }

      console.error('Play failed:', error)
      set({ error: '재생에 실패했습니다.' })
    })
  },

  /** 재생 중이면 일시정지한다. */
  pause() {
    const { audio } = get()

    if (!audio || audio.paused) {
      return
    }

    audio.pause()
  },

  /**
   * 재생을 멈추고 소스를 비운 뒤 `src`, 재생 위치, 길이, 로딩·에러 상태를 초기화한다.
   *
   * 소스를 비우는 과정에서 `error` 이벤트가 발생하지 않도록 `src` 속성을 제거한다.
   */
  stop() {
    const { audio } = get()

    if (!audio) {
      return
    }

    set(PLAYBACK_RESET)

    audio.pause()
    audio.currentTime = 0
    // `audio.src = ''`는 빈 URL을 로드하려다 `error` 이벤트를 일으키므로 속성을 지우고 다시 로드한다.
    audio.removeAttribute('src')
    audio.load()
  },

  /** 재생 위치를 `time`초로 옮긴다. */
  seek(time: number) {
    const { audio } = get()

    if (!audio) {
      return
    }

    audio.currentTime = time
  },

  /** 볼륨을 `0`–`1`로 clamp해 반영한다. 영속된다. */
  setVolume(volume: number) {
    const { audio } = get()
    const clampedVolume = Math.max(0, Math.min(1, volume))

    if (audio) {
      audio.volume = clampedVolume
    }

    set({ volume: clampedVolume })
  },

  /** 반복 재생 여부를 토글한다. 영속된다. */
  toggleLoop() {
    const { audio, isLooping } = get()
    const nextLoop = !isLooping

    if (audio) {
      audio.loop = nextLoop
    }

    set({ isLooping: nextLoop })
  },

  /** `isPlaying`만 갱신한다. */
  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
  /** `currentTime`(초)만 갱신한다. */
  setCurrentTime: (currentTime: number) => set({ currentTime }),
  /** `duration`(초)만 갱신한다. */
  setDuration: (duration: number) => set({ duration }),
  /** `isLoading`만 갱신한다. */
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  /** `error`만 갱신한다. */
  setError: (error: string | null) => set({ error }),
}
