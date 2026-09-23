// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { measureImages, toKey } from './measure-images'

const fixturesDir = fileURLToPath(new URL('./__fixtures__', import.meta.url))
const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'joolja-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe('toKey', () => {
  it('확장자를 떼고 공백을 밑줄로 바꿔 소문자로 만들어야 함', () => {
    expect(toKey('Hero Banner.png')).toBe('hero_banner')
  })

  it('파일 이름에 확장자와 같은 문자열이 있어도 끝의 확장자만 떼야 함', () => {
    expect(toKey('logo.png.png')).toBe('logo.png')
    expect(toKey('xpng.png')).toBe('xpng')
  })
})

describe('measureImages', () => {
  it('디렉터리의 이미지 크기를 키로 정리해 반환해야 함', async () => {
    const images = await measureImages({ dir: fixturesDir })

    expect(images).toEqual({
      img_1x1: { file: 'img_1x1.png', width: 1, height: 1, type: 'png' },
      img_2x2: { file: 'img_2x2.jpg', width: 2, height: 2, type: 'jpg' },
    })
  })

  it('확장자 목록에 없는 파일은 건너뛰어야 함', async () => {
    const images = await measureImages({
      dir: fixturesDir,
      extensions: ['.png'],
    })

    expect(Object.keys(images)).toEqual(['img_1x1'])
  })

  it('이미지가 아닌 파일은 무시해야 함', async () => {
    const dir = await createTempDir()
    await writeFile(path.join(dir, 'notes.txt'), 'hello')

    await expect(measureImages({ dir })).resolves.toEqual({})
  })

  it('키가 겹치는 두 파일이 있으면 던져야 함', async () => {
    const dir = await createTempDir()
    const png = await readFile(path.join(fixturesDir, 'img_1x1.png'))
    await writeFile(path.join(dir, 'a b.png'), png)
    await writeFile(path.join(dir, 'A_B.png'), png)

    await expect(measureImages({ dir })).rejects.toThrow('a_b')
  })

  it('해석할 수 없는 이미지는 파일 이름과 함께 던져야 함', async () => {
    const dir = await createTempDir()
    await writeFile(path.join(dir, 'broken.png'), 'not an image')

    await expect(measureImages({ dir })).rejects.toThrow('broken.png')
  })
})
