/** Canvas `toBlob`이 지원하는 래스터 출력 포맷. */
export type ImageOutputType = 'image/png' | 'image/jpeg' | 'image/webp'

export interface FirstFrameOptions {
  /** 출력 포맷. 기본 `'image/png'`. */
  type?: ImageOutputType
  /** `image/jpeg` / `image/webp`의 인코딩 품질(0~1). 기본 0.92. */
  quality?: number
  /**
   * 투명 영역을 평탄화할 배경색. 지정하면 모든 포맷에 적용된다.
   * 생략 시 `image/jpeg`에만 `#fff`가 적용된다 (JPEG는 알파가 없어 투명 영역이
   * 검게 채워지므로). PNG/WebP는 기본적으로 알파를 보존한다.
   */
  background?: string
}
