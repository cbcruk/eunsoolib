import { beforeEach, describe, expect, it, vi } from 'vitest'
import { audioStore, type AudioState } from './audio-store'
import { audioActions } from './audio-actions'

const baseline: AudioState = {
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

function createFakeAudio() {
  return {
    volume: 1,
    loop: false,
    paused: true,
    currentTime: 0,
    src: '',
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
  } as unknown as HTMLAudioElement
}

describe('audioActions', () => {
  beforeEach(() => {
    localStorage.clear()
    audioStore.setState(baseline)
  })

  it('setAudio는 저장된 volume/loop를 audio에 반영한다', () => {
    audioStore.setState({ ...baseline, volume: 0.5, isLooping: true })
    const audio = createFakeAudio()

    audioActions.setAudio(audio)

    expect(audioStore.getState().audio).toBe(audio)
    expect(audio.volume).toBe(0.5)
    expect(audio.loop).toBe(true)
  })

  it('setVolume은 0~1로 clamp하고 audio.volume에 반영한다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    audioActions.setVolume(1.5)
    expect(audioStore.getState().volume).toBe(1)

    audioActions.setVolume(-1)
    expect(audioStore.getState().volume).toBe(0)
    expect(audio.volume).toBe(0)
  })

  it('toggleLoop은 isLooping을 토글하고 audio.loop에 반영한다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    audioActions.toggleLoop()

    expect(audioStore.getState().isLooping).toBe(true)
    expect(audio.loop).toBe(true)
  })

  it('play는 src를 설정하고 audio.play를 호출한다', async () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    await audioActions.play('song.mp3')

    expect(audioStore.getState().src).toBe('song.mp3')
    expect(audio.play).toHaveBeenCalled()
  })

  it('stop은 재생 관련 상태를 초기화한다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)
    audioStore.setState((prev) => ({
      ...prev,
      src: 'song.mp3',
      isPlaying: true,
      currentTime: 30,
      duration: 100,
    }))

    audioActions.stop()

    const state = audioStore.getState()
    expect(state.src).toBeNull()
    expect(state.isPlaying).toBe(false)
    expect(state.currentTime).toBe(0)
    expect(state.duration).toBe(0)
  })

  it('단순 setter는 해당 필드만 갱신한다', () => {
    audioActions.setCurrentTime(12)
    audioActions.setError('오류')

    expect(audioStore.getState().currentTime).toBe(12)
    expect(audioStore.getState().error).toBe('오류')
  })
})
