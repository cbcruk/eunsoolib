import { persist } from '@cbcruk/sync-store'

/**
 * 오디오 재생 상태. 액션 메서드는 포함하지 않는 순수 데이터다.
 * `audio` 엘리먼트는 비직렬화 값이라 저장되지 않고 메모리에만 존재한다.
 */
export interface AudioState {
  /** `AudioManager`가 연결한 오디오 엘리먼트. 연결 전에는 `null`. */
  audio: HTMLAudioElement | null
  /** 지금 로드된 오디오 URL. 없으면 `null`. */
  src: string | null
  /** 재생 중인지 여부. */
  isPlaying: boolean
  /** 현재 재생 위치(초). */
  currentTime: number
  /** 전체 길이(초). 메타데이터를 읽기 전에는 `0`. */
  duration: number
  /** 로드 중인지 여부. */
  isLoading: boolean
  /** 사용자에게 보여줄 에러 메시지. 없으면 `null`. */
  error: string | null
  /** 볼륨. `0`–`1`. 영속된다. @default 1 */
  volume: number
  /** 반복 재생 여부. 영속된다. @default false */
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
