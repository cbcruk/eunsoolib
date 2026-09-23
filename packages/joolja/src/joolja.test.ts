// @vitest-environment node
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { joolja } from './joolja'

const fixturesDir = fileURLToPath(new URL('./__fixtures__', import.meta.url))
const tempDirs: string[] = []

/** 픽스처 이미지를 복사한 임시 작업 디렉터리를 만든다. */
async function createImageDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'joolja-'))
  tempDirs.push(dir)
  await cp(fixturesDir, dir, { recursive: true })
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe('joolja', () => {
  it('아무 출력도 요청하지 않으면 측정만 하고 파일을 쓰지 않아야 함', async () => {
    const dir = await createImageDir()

    const { images, written } = await joolja({ dir })

    expect(Object.keys(images)).toEqual(['img_1x1', 'img_2x2'])
    expect(written).toEqual([])
    expect(await readdir(dir)).toEqual(['img_1x1.png', 'img_2x2.jpg'])
  })

  it('json 옵션이면 result.json을 이미지 디렉터리에 써야 함', async () => {
    const dir = await createImageDir()

    const { written } = await joolja({ dir, json: true })

    expect(written).toEqual([path.join(dir, 'result.json')])
    expect(JSON.parse(await readFile(written[0], 'utf8'))).toMatchObject({
      img_1x1: { width: 1, height: 1 },
    })
  })

  it('scss 옵션이면 변수와 스프라이트를 함께 써야 함', async () => {
    const dir = await createImageDir()

    const { written } = await joolja({ dir, scss: true })

    expect(written.map((file) => path.basename(file))).toEqual([
      '_variables.scss',
      '_sprite.scss',
    ])
  })

  it('outDir이 없으면 만들어서 저장해야 함', async () => {
    const dir = await createImageDir()
    const outDir = path.join(dir, 'nested/styles')

    const { written } = await joolja({ dir, outDir, json: true })

    expect(written).toEqual([path.join(outDir, 'result.json')])
    expect(await readdir(outDir)).toEqual(['result.json'])
  })
})
