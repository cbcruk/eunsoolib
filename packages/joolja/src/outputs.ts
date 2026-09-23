import type {
  ImageMeasurements,
  OutputFile,
  OutputOptions,
} from './joolja.types'
import { toScssSprite, toScssVariables } from './scss'

/**
 * 측정 결과에서 저장할 파일 목록을 만든다.
 *
 * 파일을 쓰지는 않는다. `json`과 `scss`를 모두 끄면 빈 배열을 반환한다.
 *
 * @param images - {@linkcode measureImages}의 결과
 * @param options - 어떤 파일을 만들지
 * @returns `result.json`, `_variables.scss`, `_sprite.scss` 중 요청한 것
 *
 * @example
 * ```ts
 * import { buildOutputs, measureImages } from '@cbcruk/joolja'
 *
 * const files = buildOutputs(await measureImages(), { scss: true })
 * // [{ name: '_variables.scss', content: '...' }, { name: '_sprite.scss', content: '...' }]
 * ```
 */
export function buildOutputs(
  images: ImageMeasurements,
  options: OutputOptions = {},
): OutputFile[] {
  const files: OutputFile[] = []

  if (options.json) {
    files.push({
      name: 'result.json',
      content: `${JSON.stringify(images, null, 2)}\n`,
    })
  }

  if (options.scss) {
    files.push(
      { name: '_variables.scss', content: toScssVariables(images) },
      { name: '_sprite.scss', content: toScssSprite(images) },
    )
  }

  return files
}
