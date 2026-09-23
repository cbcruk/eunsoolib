import type { ImageMeasurements } from './joolja.types'

/**
 * 측정 결과를 SCSS 맵 변수 하나로 만든다.
 *
 * @param images - {@linkcode measureImages}의 결과
 * @returns `$images: ("key": (width, height), ...);` 한 줄
 *
 * @example
 * ```ts
 * import { measureImages, toScssVariables } from '@cbcruk/joolja'
 *
 * const scss = toScssVariables(await measureImages())
 * // $images: ("hero": (320, 96));
 * ```
 */
export function toScssVariables(images: ImageMeasurements): string {
  const body = Object.entries(images)
    .map(([key, { width, height }]) => `"${key}": (${width}, ${height})`)
    .join(', ')

  return `$images: (${body});\n`
}

/**
 * 측정 결과를 이미지마다 클래스 하나인 SCSS로 만든다.
 *
 * `background-image`의 경로는 측정한 파일 이름을 그대로 쓰므로, 생성한 SCSS는
 * 이미지와 같은 디렉터리에 두거나 경로를 맞춰 줘야 한다.
 *
 * @param images - {@linkcode measureImages}의 결과
 * @returns 클래스 규칙을 빈 줄로 이어 붙인 SCSS
 */
export function toScssSprite(images: ImageMeasurements): string {
  return Object.entries(images)
    .map(
      ([key, { file, width, height }]) => `.${key} {
  width: ${width}px;
  height: ${height}px;
  background-image: url("${file}");
}
`,
    )
    .join('\n')
}
