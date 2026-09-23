import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { JooljaOptions, JooljaResult } from './joolja.types'
import { measureImages } from './measure-images'
import { buildOutputs } from './outputs'

/**
 * 디렉터리의 이미지 크기를 재고 요청한 파일을 저장한다.
 *
 * `json`과 `scss`를 모두 끄면 측정만 하고 파일은 쓰지 않는다.
 *
 * @param options - 측정 대상, 저장 경로, 생성할 파일
 * @returns 측정 결과와 실제로 쓴 파일의 절대 경로
 *
 * @example
 * ```ts
 * import { joolja } from '@cbcruk/joolja'
 *
 * const { images, written } = await joolja({
 *   dir: './assets',
 *   outDir: './src/styles',
 *   scss: true,
 * })
 * ```
 */
export async function joolja(
  options: JooljaOptions = {},
): Promise<JooljaResult> {
  const dir = options.dir ?? process.cwd()
  const outDir = options.outDir ?? dir
  const images = await measureImages({ dir, extensions: options.extensions })
  const files = buildOutputs(images, options)

  if (files.length === 0) {
    return { images, written: [] }
  }

  await mkdir(outDir, { recursive: true })

  const written: string[] = []

  for (const file of files) {
    const filePath = path.resolve(outDir, file.name)
    await writeFile(filePath, file.content)
    written.push(filePath)
  }

  return { images, written }
}
