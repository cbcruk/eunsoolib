import { extensionForMime, isHeifFile, toOutputFilename } from './heif.utils'
import type { HeifConvertOptions, HeifOutputType } from './types'

const DEFAULT_TYPE: HeifOutputType = 'image/jpeg'
const DEFAULT_QUALITY = 0.85

/**
 * HEIF 파일을 디코딩해 지정한 포맷의 이미지 Blob으로 변환한다.
 *
 * `libheif-js`(wasm)로 디코딩한 뒤 canvas로 재인코딩하므로 브라우저 환경에서만
 * 동작한다 (`document`, `ImageData`, `HTMLCanvasElement` 필요). `libheif-js`는
 * 동적 import 되므로 HEIF를 실제로 변환할 때만 로드된다.
 *
 * @throws 디코딩 실패, canvas 컨텍스트 획득 실패, 인코딩 실패 시
 */
export async function heifToBlob(
  file: File,
  options: HeifConvertOptions = {},
): Promise<Blob> {
  const type = options.type ?? DEFAULT_TYPE
  const quality = options.quality ?? DEFAULT_QUALITY

  const { default: libheif } = await import('libheif-js/wasm-bundle')

  const buffer = new Uint8Array(await file.arrayBuffer())
  const images = new libheif.HeifDecoder().decode(buffer)
  if (images.length === 0) {
    throw new Error('HEIF decode failed: no images found')
  }

  const image = images[0]
  const width = image.get_width()
  const height = image.get_height()

  const rgba = await new Promise<ImageData>((resolve, reject) => {
    image.display(
      { data: new Uint8ClampedArray(width * height * 4), width, height },
      (result) =>
        result ? resolve(result) : reject(new Error('HEIF display failed')),
    )
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context')
  }
  ctx.putImageData(new ImageData(rgba.data, width, height), 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas encoding failed')),
      type,
      quality,
    )
  })
}

/**
 * HEIF 파일이면 변환된 `File`을, 아니면 입력 `File`을 그대로 반환한다.
 * 업로드 파이프라인에서 HEIF만 골라 변환할 때 쓰기 좋은 진입점.
 */
export async function processImageFile(
  file: File,
  options: HeifConvertOptions = {},
): Promise<File> {
  if (!isHeifFile(file)) {
    return file
  }

  const type = options.type ?? DEFAULT_TYPE
  const blob = await heifToBlob(file, options)
  const filename = toOutputFilename(file.name, extensionForMime(type))

  return new File([blob], filename, { type })
}
