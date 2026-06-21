import type { FirstFrameOptions } from './image-first-frame.types'

/**
 * 애니메이션 이미지(GIF / 애니메이션 WebP / APNG 등)의 첫 프레임을 canvas에 그린다.
 * `createImageBitmap`은 애니메이션 소스를 줘도 첫 프레임만 디코딩한다.
 *
 * 투명 영역 평탄화: `background`를 주면 그 색으로, 생략하면 `image/jpeg`일 때만
 * 흰색으로 채운다(JPEG는 알파가 없음). PNG/WebP는 알파를 보존한다.
 */
export async function imageFirstFrameToCanvas(
  source: ImageBitmapSource,
  options: FirstFrameOptions = {},
): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('createImageBitmap is not supported in this environment')
  }
  const { type = 'image/png', background } = options

  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')

    const fill = background ?? (type === 'image/jpeg' ? '#fff' : null)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(bitmap, 0, 0)
    return canvas
  } finally {
    bitmap.close()
  }
}

/**
 * 애니메이션 이미지의 첫 프레임을 원하는 포맷의 `Blob`으로 추출한다.
 *
 * ```ts
 * const thumb = await imageFirstFrameToBlob(gifFile, { type: 'image/jpeg' })
 * ```
 */
export async function imageFirstFrameToBlob(
  source: ImageBitmapSource,
  options: FirstFrameOptions = {},
): Promise<Blob> {
  const { type = 'image/png', quality = 0.92 } = options
  const canvas = await imageFirstFrameToCanvas(source, options)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality,
    )
  })
}
