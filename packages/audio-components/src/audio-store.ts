import { persist } from '@eunsoolib/sync-store'

/**
 * 오디오 재생 상태. 액션 메서드는 포함하지 않는 순수 데이터다.
 * `audio` 엘리먼트는 비직렬화 값이라 저장되지 않고 메모리에만 존재한다.
 */
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
}

const initialState: AudioState = {
  audio: null,
  src: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null,
  volume: 1,
  isLooping: false,
}

/**
 * framework-agnostic 싱글턴 core.
 * `volume` / `isLooping`만 localStorage(`audio-storage`)에 영속화한다.
 */
export const audioStore = persist<
  AudioState,
  Pick<AudioState, 'volume' | 'isLooping'>
>(initialState, {
  name: 'audio-storage',
  partialize: ({ volume, isLooping }) => ({ volume, isLooping }),
})
