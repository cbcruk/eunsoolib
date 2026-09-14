// @vitest-environment node

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect, Either } from 'effect'
import { FetchHttpClient } from '@effect/platform'
import { NodeContext } from '@effect/platform-node'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  downloadImage,
  downloadImageEffect,
  DownloadImageError,
} from './download-image.js'

const IMAGE_URL = 'https://images.test/avatar'

/** 1x1 PNG 이미지 바이트 */
const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  ),
  (char) => char.charCodeAt(0),
)

let dest: string

beforeEach(async () => {
  dest = await mkdtemp(join(tmpdir(), 'download-image-'))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(dest, { recursive: true, force: true })
})

/** 네트워크 대신 고정 응답을 돌려주는 fetch mock을 만든다. */
function mockFetch(response: () => Response | Promise<Response>) {
  return vi.fn<typeof fetch>(async () => response())
}

/** Effect 버전을 mock fetch와 실제 Node 파일 시스템으로 실행한다. */
function runEffect(
  params: Parameters<typeof downloadImageEffect>[0],
  fetchImpl: typeof fetch,
) {
  return downloadImageEffect(params).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.Fetch, fetchImpl),
    Effect.either,
    Effect.runPromise,
  )
}

describe('downloadImageEffect', () => {
  test('이미지를 저장하고 저장한 경로로 성공해야 함', async () => {
    const fetchImpl = mockFetch(() => new Response(png, { status: 200 }))

    const result = await runEffect({ url: IMAGE_URL, dest }, fetchImpl)

    expect(result).toEqual(Either.right(`${dest}/image.png`))
    expect(new Uint8Array(await readFile(`${dest}/image.png`))).toEqual(png)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(String(fetchImpl.mock.calls[0][0])).toBe(IMAGE_URL)
  })

  test('filename 옵션으로 파일명을 바꿀 수 있어야 함', async () => {
    const fetchImpl = mockFetch(() => new Response(png, { status: 200 }))

    const result = await runEffect(
      { url: IMAGE_URL, dest, filename: 'avatar' },
      fetchImpl,
    )

    expect(result).toEqual(Either.right(`${dest}/avatar.png`))
    expect(await readdir(dest)).toEqual(['avatar.png'])
  })

  test('dest 디렉터리가 없으면 재귀적으로 만들어야 함', async () => {
    const nested = join(dest, 'a', 'b')
    const fetchImpl = mockFetch(() => new Response(png, { status: 200 }))

    const result = await runEffect({ url: IMAGE_URL, dest: nested }, fetchImpl)

    expect(result).toEqual(Either.right(`${nested}/image.png`))
  })

  test('2xx가 아닌 응답이면 저장하지 않고 DownloadImageError로 실패해야 함', async () => {
    const fetchImpl = mockFetch(() => new Response(png, { status: 404 }))

    const result = await runEffect({ url: IMAGE_URL, dest }, fetchImpl)

    const error = Either.isLeft(result) ? result.left : undefined
    expect(error).toBeInstanceOf(DownloadImageError)
    expect(error?.message).toContain('404')
    expect(await readdir(dest)).toEqual([])
  })

  test('요청 자체가 실패하면 DownloadImageError로 실패해야 함', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('network down')
    })

    const result = await runEffect({ url: IMAGE_URL, dest }, fetchImpl)

    const error = Either.isLeft(result) ? result.left : undefined
    expect(error).toBeInstanceOf(DownloadImageError)
    expect(error?.cause).toBeDefined()
  })

  test('형식을 판별할 수 없는 본문이면 DownloadImageError로 실패해야 함', async () => {
    const fetchImpl = mockFetch(
      () => new Response('plain text', { status: 200 }),
    )

    const result = await runEffect({ url: IMAGE_URL, dest }, fetchImpl)

    const error = Either.isLeft(result) ? result.left : undefined
    expect(error).toBeInstanceOf(DownloadImageError)
    expect(await readdir(dest)).toEqual([])
  })
})

describe('downloadImage', () => {
  test('저장한 파일 경로로 resolve해야 함', async () => {
    const fetchImpl = mockFetch(() => new Response(png, { status: 200 }))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(
      downloadImage({ url: IMAGE_URL, dest, filename: 'photo' }),
    ).resolves.toBe(`${dest}/photo.png`)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('실패하면 DownloadImageError로 reject해야 함', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() => new Response('nope', { status: 500 })),
    )

    await expect(
      downloadImage({ url: IMAGE_URL, dest }),
    ).rejects.toBeInstanceOf(DownloadImageError)
  })
})
