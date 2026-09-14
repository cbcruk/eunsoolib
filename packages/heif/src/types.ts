/** HEIF 디코딩 결과를 다시 인코딩할 출력 이미지 MIME 타입. */
export type HeifOutputType = 'image/jpeg' | 'image/png' | 'image/webp'

/** {@link heifToBlob}와 {@link processImageFile}의 변환 옵션. */
export interface HeifConvertOptions {
  /** 출력 MIME 타입. @default 'image/jpeg' */
  type?: HeifOutputType
  /** 손실 포맷(jpeg/webp)의 품질 (0–1). @default 0.85 */
  quality?: number
}
