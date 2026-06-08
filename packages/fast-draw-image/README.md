# @eunsoolib/fast-draw-image

Canvas를 위한 논블로킹 크로스브라우저 이미지 렌더링 라이브러리입니다.

> [Alexander Myshov의 Performance Calendar 2025 연구](https://calendar.perfplanet.com/2025/non-blocking-image-canvas/) 기반

## 문제

Canvas의 `drawImage()`는 큰 이미지를 처리할 때 메인 스레드를 블로킹합니다. 문제는 브라우저마다 논블로킹으로 동작하는 방식이 다르다는 것입니다.

| 접근 방식                              | Chrome          | Firefox         | Safari          |
| -------------------------------------- | --------------- | --------------- | --------------- |
| `image.onload` + `drawImage`           | ❌ 블로킹       | ❌ 블로킹       | ❌ 블로킹       |
| `image.decode()` + `createImageBitmap` | ❌ 블로킹       | ✅ Non-blocking | ✅ Non-blocking |
| `fetch` + `blob` + `createImageBitmap` | ✅ Non-blocking | ❌ 블로킹       | ❌ 블로킹       |

## 해결

브라우저를 감지해 각각에 맞는 최적의 방식을 사용합니다.

- **Chromium (Chrome, Edge, Brave, Opera)**: `fetch` → `blob` → `createImageBitmap`
- **Firefox, Safari**: `Image.decode()` → `createImageBitmap`

## 설치

```bash
pnpm add @eunsoolib/fast-draw-image
```

## 사용법

### 기본 - 이미지 로드

```typescript
import { loadImage } from '@eunsoolib/fast-draw-image'

const bitmap = await loadImage('https://example.com/large-image.jpg')

const ctx = canvas.getContext('2d')
ctx.drawImage(bitmap, 0, 0)
```

### Canvas에 그리기

```typescript
import { drawImage } from '@eunsoolib/fast-draw-image'

await drawImage('image.jpg', {
  canvas: 'myCanvas', // Canvas ID 또는 HTMLCanvasElement
  x: 10,
  y: 20,
  width: 200,
  height: 150,
})

// 스프라이트 시트에서 일부만 그리기
await drawImage('spritesheet.png', {
  canvas: canvasElement,
  sx: 0,
  sy: 0,
  sWidth: 64,
  sHeight: 64,
  x: 100,
  y: 100,
  width: 128,
  height: 128,
})
```

### 여러 이미지 프리로드

```typescript
import { preload } from '@eunsoolib/fast-draw-image'

const images = await preload(['frame1.jpg', 'frame2.jpg', 'frame3.jpg'], {
  concurrency: 2,
  onProgress: (loaded, total) => {
    console.log(`Loading: ${loaded}/${total}`)
  },
})

images.get('frame1.jpg') // ImageBitmap
```

### 클래스 인스턴스

더 세밀한 제어가 필요하면 클래스 인스턴스를 직접 사용합니다.

```typescript
import { FastDrawImage } from '@eunsoolib/fast-draw-image'

const loader = new FastDrawImage()

loader.getBrowserType() // 'chromium' | 'firefox' | 'safari' | 'unknown'

const bitmap = await loader.loadImage('image.jpg')

loader.isCached('image.jpg') // true
loader.getCached('image.jpg') // ImageBitmap
loader.clearCache('image.jpg') // 단일 이미지 제거
loader.clearAllCache() // 전체 캐시 제거
loader.getCacheStats() // { size: 0, urls: [] }
```

### AbortController로 취소

```typescript
import { loadImage } from '@eunsoolib/fast-draw-image'

const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)

try {
  const bitmap = await loadImage('huge-image.jpg', {
    signal: controller.signal,
  })
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Image loading cancelled')
  }
}
```

## API

### `loadImage(url, options?)`

이미지를 ImageBitmap으로 로드합니다.

| Option   | Type          | Default | Description   |
| -------- | ------------- | ------- | ------------- |
| `cache`  | `boolean`     | `true`  | 캐싱 활성화   |
| `signal` | `AbortSignal` | -       | 취소용 시그널 |

### `drawImage(url, options?)`

이미지를 로드하고 Canvas에 그립니다.

| Option                          | Type                          | Default   | Description          |
| ------------------------------- | ----------------------------- | --------- | -------------------- |
| `canvas`                        | `HTMLCanvasElement \| string` | -         | 타겟 Canvas          |
| `x`, `y`                        | `number`                      | `0`       | 그릴 위치            |
| `width`, `height`               | `number`                      | 원본 크기 | 그릴 크기            |
| `sx`, `sy`, `sWidth`, `sHeight` | `number`                      | -         | 소스 영역 (sprite용) |
| `cache`                         | `boolean`                     | `true`    | 캐싱 활성화          |
| `signal`                        | `AbortSignal`                 | -         | 취소용 시그널        |

### `preload(urls, options?)`

여러 이미지를 병렬로 프리로드합니다.

| Option        | Type                      | Default | Description       |
| ------------- | ------------------------- | ------- | ----------------- |
| `concurrency` | `number`                  | `4`     | 최대 동시 로드 수 |
| `onProgress`  | `(loaded, total) => void` | -       | 진행 콜백         |
| `cache`       | `boolean`                 | `true`  | 캐싱 활성화       |
| `signal`      | `AbortSignal`             | -       | 취소용 시그널     |

## 활용 사례

- **비디오 스크러빙**: 스프라이트 시트 이미지로 비디오 프리뷰
- **이미지 편집 도구**: 큰 이미지 편집 시 UI 반응성 유지
- **인터랙티브 시각화**: 동적 캔버스 렌더링
- **게임 에셋**: 게임 리소스 로딩

## 브라우저 지원

- Chrome 66+
- Firefox 65+
- Safari 15+
- Edge 79+

`createImageBitmap` API가 필요합니다.

## 참고

- [Non-blocking cross-browser image rendering on the canvas](https://calendar.perfplanet.com/2025/non-blocking-image-canvas/)
- [Chromium Issue #40846471](https://issues.chromium.org/issues/40846471)
- [WebKit Bug #241402](https://bugs.webkit.org/show_bug.cgi?id=241402)
