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
    removeAttribute: vi.fn(),
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

  it('같은 src로 play하면 재생 후 isLoading을 해제해 다음 play도 동작한다', async () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    await audioActions.play('song.mp3')
    audioActions.setIsLoading(false)
    audio.pause()

    await audioActions.play('song.mp3')

    expect(audioStore.getState().isLoading).toBe(false)

    await audioActions.play('song.mp3')

    expect(audio.play).toHaveBeenCalledTimes(3)
    expect(audio.load).toHaveBeenCalledTimes(1)
  })

  it('새 src로 play해도 재생이 시작되면 isLoading을 해제한다', async () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    await audioActions.play('song.mp3')

    expect(audioStore.getState().isLoading).toBe(false)
  })

  it('play가 실패하면 에러 메시지를 넣고 isLoading을 해제한다', async () => {
    const audio = createFakeAudio()
    vi.mocked(audio.play).mockRejectedValueOnce(new Error('NotAllowedError'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    audioActions.setAudio(audio)

    await audioActions.play('song.mp3')

    expect(audioStore.getState().error).toBe('재생에 실패했습니다.')
    expect(audioStore.getState().isLoading).toBe(false)
    consoleError.mockRestore()
  })

  it('pause나 stop으로 중단된 play(AbortError)는 에러로 표시하지 않는다', async () => {
    const audio = createFakeAudio()
    vi.mocked(audio.play).mockRejectedValueOnce(
      new DOMException('interrupted', 'AbortError'),
    )
    audioActions.setAudio(audio)

    await audioActions.play('song.mp3')

    expect(audioStore.getState().error).toBeNull()
  })

  it('togglePlay는 src가 없으면 play를 호출하지 않는다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)

    audioActions.togglePlay()

    expect(audio.play).not.toHaveBeenCalled()
  })

  it('togglePlay는 src가 있고 재생 중이 아니면 play를 호출한다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)
    audioStore.setState((prev) => ({ ...prev, src: 'song.mp3' }))

    audioActions.togglePlay()

    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('stop은 빈 src를 대입하지 않고 src 속성을 제거해 다시 로드한다', () => {
    const audio = createFakeAudio()
    audioActions.setAudio(audio)
    audioStore.setState((prev) => ({ ...prev, src: 'song.mp3' }))
    audio.src = 'song.mp3'

    audioActions.stop()

    expect(audio.src).toBe('song.mp3')
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(audio.load).toHaveBeenCalled()
  })

  it('setAudio(null)은 등록을 해제하고 재생 상태를 초기화한다', () => {
    audioActions.setAudio(createFakeAudio())
    audioStore.setState((prev) => ({
      ...prev,
      src: 'song.mp3',
      isPlaying: true,
      currentTime: 30,
      duration: 100,
      volume: 0.3,
    }))

    audioActions.setAudio(null)

    const state = audioStore.getState()
    expect(state.audio).toBeNull()
    expect(state.src).toBeNull()
    expect(state.isPlaying).toBe(false)
    expect(state.currentTime).toBe(0)
    expect(state.volume).toBe(0.3)
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
