# @eunsoolib/heif

브라우저에서 HEIF(`.heic`/`.heif`) 이미지를 JPEG/PNG/WebP로 변환

iOS가 기본으로 찍는 HEIC는 대부분의 브라우저·서버가 디코딩하지 못합니다. 이 패키지는 `libheif-js`(wasm)로 디코딩한 뒤 canvas로 재인코딩해, 업로드 직전에 호환 포맷으로 바꿔줍니다.

## 설치

```bash
pnpm add @eunsoolib/heif libheif-js
```

`libheif-js`는 peer dependency입니다 (wasm 디코더). 실제 변환 시 동적 import 되므로, HEIF가 아닌 파일만 다루는 경로에서는 로드되지 않습니다.

## 사용법

### 업로드 파이프라인 (권장)

`processImageFile`은 HEIF면 변환된 `File`을, 아니면 입력을 **그대로** 반환합니다. 파일 종류를 가리지 않고 한 번에 통과시킬 수 있습니다.

```typescript
import { processImageFile } from '@eunsoolib/heif'

async function handleUpload(file: File): Promise<File> {
  const safe = await processImageFile(file)
  // photo.heic → photo.jpg (변환), photo.png → 그대로
  return safe
}
```

### 직접 변환

```typescript
import { heifToBlob } from '@eunsoolib/heif'

const blob = await heifToBlob(heicFile, { type: 'image/webp', quality: 0.9 })
const url = URL.createObjectURL(blob)
```

### HEIF 여부만 판별

```typescript
import { isHeifFile } from '@eunsoolib/heif'

isHeifFile(new File([], 'IMG_0001.HEIC')) // true
```

## API

### `processImageFile(file, options?)`

```typescript
function processImageFile(
  file: File,
  options?: HeifConvertOptions,
): Promise<File>
```

HEIF 파일이면 변환해 새 `File`(확장자도 출력 포맷에 맞게 치환)을, 아니면 입력 `File`을 그대로 반환합니다.

### `heifToBlob(file, options?)`

```typescript
function heifToBlob(file: File, options?: HeifConvertOptions): Promise<Blob>
```

HEIF를 디코딩해 이미지 `Blob`으로 변환합니다. 입력이 HEIF인지는 검사하지 않습니다.

### `isHeifFile(file)`

```typescript
function isHeifFile(file: File): boolean
```

파일명이 `.heic`/`.heif`(대소문자 무시) 확장자인지 판별합니다.

### `HeifConvertOptions`

```typescript
interface HeifConvertOptions {
  /** 출력 MIME 타입. 기본값 'image/jpeg'. */
  type?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** 손실 포맷(jpeg/webp)의 품질 (0–1). 기본값 0.85. */
  quality?: number
}
```

## 동작 방식

```
File(.heic) ──libheif.decode──▶ HeifImage ──display──▶ RGBA(ImageData)
                                                            │
   File(.jpg) ◀──canvas.toBlob──◀ canvas.putImageData ◀────┘
```

여러 이미지가 든 HEIF(버스트/라이브 포토)는 첫 번째 이미지만 변환합니다.

## 제약

- **브라우저 전용**: `document`, `ImageData`, `HTMLCanvasElement`에 의존합니다. Node 환경에서는 동작하지 않습니다.
- canvas 디코딩·인코딩이 동기적으로 메인 스레드를 점유하므로, 대용량/다수 파일은 Web Worker에서 호출하는 것을 권장합니다.
