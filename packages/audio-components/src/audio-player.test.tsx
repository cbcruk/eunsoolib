import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AudioManager } from './audio-manager'
import { CastAudioPlayer } from './audio-player'
import { audioStore, type AudioState } from './audio-store'

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

beforeEach(() => {
  localStorage.clear()
  audioStore.setState(baseline)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CastAudioPlayer', () => {
  it('현재 src가 아닌 플레이어는 재생 상태와 시간을 표시하지 않아야 함', () => {
    audioStore.setState({
      ...baseline,
      src: 'a.mp3',
      isPlaying: true,
      currentTime: 65,
      duration: 125,
    })

    render(
      <>
        <div data-testid="a">
          <CastAudioPlayer src="a.mp3" />
        </div>
        <div data-testid="b">
          <CastAudioPlayer src="b.mp3" />
        </div>
      </>,
    )

    const playerA = screen.getByTestId('a')
    const playerB = screen.getByTestId('b')

    expect(playerA).toHaveTextContent('⏸ 일시정지')
    expect(playerA).toHaveTextContent('01:05')
    expect(playerA).toHaveTextContent('02:05')

    expect(playerB).toHaveTextContent('▶ 재생')
    expect(playerB).not.toHaveTextContent('01:05')
    expect(playerB).not.toHaveTextContent('02:05')
  })

  it('반복 버튼의 title과 라벨이 같은 상태를 가리켜야 함', () => {
    render(<CastAudioPlayer src="a.mp3" />)

    const off = screen.getByRole('button', { pressed: false })

    expect(off).toHaveAttribute('title', '반복 재생')
    expect(off).toHaveTextContent('반복 꺼짐')

    act(() => {
      fireEvent.click(off)
    })

    const on = screen.getByRole('button', { pressed: true })

    expect(on).toHaveAttribute('title', '반복 해제')
    expect(on).toHaveTextContent('반복 켜짐')
  })
})

describe('AudioManager', () => {
  it('언마운트하면 store에서 오디오 엘리먼트와 재생 상태를 정리해야 함', () => {
    const { unmount } = render(<AudioManager />)
    const audio = audioStore.getState().audio

    expect(audio).toBeInstanceOf(HTMLAudioElement)

    audioStore.setState((prev) => ({
      ...prev,
      src: 'a.mp3',
      isPlaying: true,
      currentTime: 10,
    }))

    unmount()

    const state = audioStore.getState()
    expect(state.audio).toBeNull()
    expect(state.src).toBeNull()
    expect(state.isPlaying).toBe(false)
    expect(state.currentTime).toBe(0)
    expect(audio?.hasAttribute('src')).toBe(false)
  })

  it('src가 없을 때 발생한 error 이벤트는 에러 메시지로 남기지 않아야 함', () => {
    render(<AudioManager />)
    const audio = audioStore.getState().audio!

    act(() => {
      audio.dispatchEvent(new Event('error'))
    })

    expect(audioStore.getState().error).toBeNull()
  })

  it('src가 있을 때 발생한 error 이벤트는 에러 메시지로 남겨야 함', () => {
    render(<AudioManager />)
    const audio = audioStore.getState().audio!

    audioStore.setState((prev) => ({ ...prev, src: 'a.mp3', isLoading: true }))

    act(() => {
      audio.dispatchEvent(new Event('error'))
    })

    expect(audioStore.getState().error).toBe('오디오를 재생할 수 없습니다.')
    expect(audioStore.getState().isLoading).toBe(false)
  })
})
