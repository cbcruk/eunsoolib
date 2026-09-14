# @eunsoolib/audio-components

`@eunsoolib/sync-store` 기반의 전역 오디오 상태와, 그 위에 얹은 오디오 플레이어
컴포넌트입니다.

앱 전체에서 `HTMLAudioElement` 하나를 공유하는 싱글턴 store(`audioStore`)가 재생 상태를
들고, 컴포넌트는 `useAudioStore`로 필요한 slice만 구독합니다. 볼륨과 반복 여부는
localStorage에 저장됩니다.

## 설치

```bash
pnpm add @eunsoolib/audio-components react
```

브라우저 전용입니다. 내부적으로 `@eunsoolib/sync-store`와 `@use-gesture/react`를 사용합니다.

## 사용법

### 플레이어 컴포넌트

`AudioManager`를 앱에 **한 번** 마운트해 오디오 엘리먼트를 만들고 이벤트를 store에
연결한 뒤, 플레이어를 원하는 만큼 렌더링합니다.

```tsx
import { AudioManager, CastAudioPlayer } from '@eunsoolib/audio-components'

function App() {
  return (
    <>
      <AudioManager />
      <CastAudioPlayer src="/audio/episode-1.mp3" />
      <CastAudioPlayer src="/audio/episode-2.mp3" />
    </>
  )
}
```

다른 `src`의 플레이어에서 재생하면 공유 오디오의 소스가 교체됩니다.

### 직접 UI 만들기

```tsx
import {
  audioActions,
  formatDuration,
  useAudioStore,
} from '@eunsoolib/audio-components'

function MiniPlayer({ src }: { src: string }) {
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const currentTime = useAudioStore((state) => state.currentTime)

  return (
    <button
      onClick={() =>
        isPlaying ? audioActions.pause() : audioActions.play(src)
      }
    >
      {isPlaying ? '일시정지' : '재생'} {formatDuration(currentTime)}
    </button>
  )
}
```

액션은 React 밖에서도 호출할 수 있습니다. 단, `AudioManager`가 마운트되어 오디오
엘리먼트가 등록되기 전에는 재생 관련 액션이 아무것도 하지 않습니다.

## API

### `<AudioManager />`

`new Audio()`(`preload = 'metadata'`)를 만들어 `audioActions.setAudio`로 등록하고,
`play` / `pause` / `ended` / `timeupdate` / `loadedmetadata` / `loadstart` / `canplay` /
`error` 이벤트를 store에 반영합니다. 아무것도 렌더링하지 않으며, 언마운트 시 재생을
멈추고 소스를 비웁니다.

### `<CastAudioPlayer src />`

재생/일시정지, 진행 바, 현재·전체 시간, 볼륨 슬라이더, 반복 토글이 있는 플레이어입니다.
스타일은 Tailwind 유틸리티 클래스로 작성되어 있습니다. 이전/다음 버튼은 비활성
상태로만 렌더링됩니다.

| Prop  | Type     | Default | Description       |
| ----- | -------- | ------- | ----------------- |
| `src` | `string` | —       | 재생할 오디오 URL |

### `<AudioPlayerSlider value onChange />`

드래그로 0~1 값을 고르는 가로 슬라이더입니다. 스타일이 없는 마크업만 렌더링하므로
`[data-scope]`, `[data-part="rail" | "track" | "handle"]` 선택자로 직접 꾸며야 합니다.
`track`의 `width`와 `handle`의 `left`는 인라인 `%`로 지정됩니다.

| Prop       | Type                      | Default | Description           |
| ---------- | ------------------------- | ------- | --------------------- |
| `value`    | `number`                  | —       | 현재 값(0~1)          |
| `onChange` | `(value: number) => void` | —       | 드래그 위치 비율(0~1) |

### `audioStore`

`persist`로 만든 싱글턴 `Store<AudioState>`입니다. `volume`, `isLooping`만
localStorage의 `audio-storage` 키에 저장됩니다.

```ts
interface AudioState {
  audio: HTMLAudioElement | null
  src: string | null
  isPlaying: boolean
  currentTime: number // 초
  duration: number // 초
  isLoading: boolean
  error: string | null
  volume: number // 0~1, 기본 1
  isLooping: boolean
}
```

### `useAudioStore(selector?)`

`useStore(audioStore, selector)`의 얇은 래퍼입니다. selector를 생략하면 상태 전체를
반환합니다.

### `audioActions`

| Action              | 설명                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `setAudio(audio)`   | 오디오 엘리먼트를 등록하고 저장된 `volume` / `isLooping`을 반영                                |
| `play(src)`         | `src`가 현재와 다르면 소스를 교체해 재생, 같으면 이어서 재생. 로딩 중이면 무시                 |
| `togglePlay()`      | `isPlaying`에 따라 재생/일시정지                                                               |
| `pause()`           | 일시정지                                                                                       |
| `stop()`            | 정지 후 `src`, 재생 위치, 길이, 로딩·에러 상태 초기화                                          |
| `seek(time)`        | 재생 위치(초) 이동                                                                             |
| `setVolume(volume)` | 0~1로 clamp해 반영                                                                             |
| `toggleLoop()`      | 반복 여부 토글                                                                                 |
| `setIsPlaying` 등   | `setIsPlaying`, `setCurrentTime`, `setDuration`, `setIsLoading`, `setError` — 해당 필드만 갱신 |

재생 실패 시 `error`에 한국어 메시지가 들어갑니다.

### `formatDuration(seconds)`

초를 `mm:ss` 문자열로 바꿉니다. 시간 단위로 올리지 않습니다(`3665` → `'61:05'`).

### `formatCount(count)`

1,000 이상은 `K`, 1,000,000 이상은 `M`을 붙여 소수 첫째 자리까지 표시합니다
(`1500` → `'1.5K'`).
