/** HEIF 디코딩 결과를 다시 인코딩할 출력 이미지 MIME 타입. */
export type HeifOutputType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface HeifConvertOptions {
  /** 출력 MIME 타입. 기본값 `'image/jpeg'`. */
  type?: HeifOutputType
  /** 손실 포맷(jpeg/webp)의 품질 (0–1). 기본값 `0.85`. */
  quality?: number
}
