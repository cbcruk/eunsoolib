import { useStore } from '@eunsoolib/sync-store'
import { audioStore, type AudioState } from './audio-store'

/**
 * 오디오 core를 React에 연결하는 얇은 레이어.
 * selector로 필요한 slice만 구독한다. 액션은 `audioActions`를 직접 호출한다.
 */
export function useAudioStore<U = AudioState>(
  selector: (state: AudioState) => U = (state) => state as unknown as U,
): U {
  return useStore(audioStore, selector)
}
