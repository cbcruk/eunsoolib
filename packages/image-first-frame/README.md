# @eunsoolib/image-first-frame

애니메이션 이미지(GIF · 애니메이션 WebP · APNG)의 **첫 프레임**을 PNG/JPEG/WebP
`Blob`으로 추출하는 브라우저 유틸리티입니다.

`createImageBitmap`이 애니메이션 소스를 줘도 첫 프레임만 디코딩한다는 점을 이용해,
별도 GIF 파서 없이 정지 썸네일을 만듭니다.

## 설치

```bash
pnpm add @eunsoolib/image-first-frame
```

## 사용법

```typescript
import { imageFirstFrameToBlob } from '@eunsoolib/image-first-frame'

// <input type="file"> 등에서 받은 GIF File
const thumbnail = await imageFirstFrameToBlob(gifFile, {
  type: 'image/jpeg',
  quality: 0.9,
})

// 업로드하거나 미리보기로 사용
const url = URL.createObjectURL(thumbnail)
```

입력은 `ImageBitmapSource`(File / Blob / ImageData 등)를 받습니다.

### 투명 영역 처리

JPEG는 알파 채널이 없어 투명 영역이 검게 채워집니다. 그래서 `type: 'image/jpeg'`일
때는 기본적으로 흰 배경을 깔아 평탄화합니다. `background`를 직접 주면 포맷과 무관하게
그 색으로 평탄화합니다.

```typescript
// PNG지만 투명 영역을 검정으로 평탄화
await imageFirstFrameToBlob(file, { type: 'image/png', background: '#000' })
```

### 캔버스가 필요하면

`Blob` 대신 그려진 캔버스가 필요할 때(데이터 URL, 추가 가공 등):

```typescript
import { imageFirstFrameToCanvas } from '@eunsoolib/image-first-frame'

const canvas = await imageFirstFrameToCanvas(file, { type: 'image/jpeg' })
const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
```

## API

### `imageFirstFrameToBlob(source, options?)`

첫 프레임을 지정 포맷의 `Blob`으로 반환합니다.

### `imageFirstFrameToCanvas(source, options?)`

첫 프레임을 그린 `HTMLCanvasElement`를 반환합니다. 비트맵은 그린 직후 닫힙니다.

### `options`

| Option       | Type                                          | Default       | Description                          |
| ------------ | --------------------------------------------- | ------------- | ------------------------------------ |
| `type`       | `'image/png' \| 'image/jpeg' \| 'image/webp'` | `'image/png'` | 출력 포맷                            |
| `quality`    | `number`                                      | `0.92`        | JPEG/WebP 인코딩 품질(0~1)           |
| `background` | `string`                                      | —             | 투명 영역 평탄화 색 (JPEG 기본 흰색) |

## 브라우저 지원

`createImageBitmap`과 Canvas `toBlob`이 필요합니다. 미지원 환경에서는 명시적으로
에러를 던집니다.
