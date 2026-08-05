import imageSize from 'image-size'

/**
 * 이미지 버퍼에서 가로/세로 크기를 추출
 *
 * 파일 전체를 디코딩하지 않고 헤더만 읽어 크기를 판별한다.
 *
 * @param input - 이미지 파일의 바이너리 버퍼
 * @returns `width` / `height` / `type` 등을 담은 크기 정보
 * @throws 지원하지 않는 형식이거나 헤더가 손상된 경우
 * @example
 * ```ts
 * const { width, height } = await getDimensions(buffer)
 * ```
 */
export async function getDimensions(input: Buffer) {
  return imageSize(input)
}
