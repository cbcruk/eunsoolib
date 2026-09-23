import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { imageSize } from 'image-size'
import type { ImageMeasurements, MeasureOptions } from './joolja.types'

/** 확장자를 따로 지정하지 않았을 때 측정하는 포맷. */
export const DEFAULT_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
]

/**
 * 파일 이름을 SCSS 변수와 클래스 이름으로 쓸 키로 바꾼다.
 *
 * @param file - 확장자를 포함한 파일 이름
 * @returns 확장자를 떼고 공백을 `_`로 바꾼 소문자 문자열
 *
 * @example
 * ```ts
 * import { toKey } from '@cbcruk/joolja'
 *
 * toKey('Hero Banner.png') // 'hero_banner'
 * ```
 */
export function toKey(file: string): string {
  return path
    .basename(file, path.extname(file))
    .replace(/\s+/g, '_')
    .toLowerCase()
}

/**
 * 디렉터리 안의 이미지 크기를 잰다.
 *
 * 하위 디렉터리는 훑지 않는다. 파일 이름 순서대로 읽으며, 읽거나 해석하지 못하는
 * 파일이 있으면 던진다.
 *
 * @param options - 대상 디렉터리와 확장자
 * @returns 키로 찾는 측정 결과
 * @throws 두 파일이 같은 키가 되거나(`A B.png`와 `a_b.png`), 이미지를 해석하지 못할 때
 *
 * @example
 * ```ts
 * import { measureImages } from '@cbcruk/joolja'
 *
 * const images = await measureImages({ dir: './assets' })
 * // { hero: { file: 'hero.png', width: 320, height: 96, type: 'png' } }
 * ```
 */
export async function measureImages(
  options: MeasureOptions = {},
): Promise<ImageMeasurements> {
  const dir = options.dir ?? process.cwd()
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS
  const entries = await readdir(dir, { withFileTypes: true })
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        extensions.includes(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort()

  const images: ImageMeasurements = {}

  for (const file of files) {
    const key = toKey(file)
    const conflict = images[key]

    if (conflict) {
      throw new Error(
        `"${conflict.file}"와 "${file}"이 같은 이름 "${key}"이 됩니다. 파일 이름을 바꿔 주세요.`,
      )
    }

    const buffer = await readFile(path.join(dir, file))

    try {
      const { width, height, type } = imageSize(buffer)
      images[key] = { file, width, height, type }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`"${file}"의 크기를 잴 수 없습니다: ${reason}`)
    }
  }

  return images
}
