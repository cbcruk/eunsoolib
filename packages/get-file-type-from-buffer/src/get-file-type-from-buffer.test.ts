// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { Effect, Either } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  FileTypeFromBufferError,
  getFileTypeFromBuffer,
} from './get-file-type-from-buffer'

const readFixture = () =>
  readFile(new URL('./__fixtures__/image.jpg', import.meta.url))

describe('getFileTypeFromBuffer', () => {
  it('Node Buffer의 매직 넘버로 JPEG를 판별해야 함', async () => {
    const file = await readFixture()

    const fileType = await Effect.runPromise(getFileTypeFromBuffer(file))

    expect(fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
  })

  it('Uint8Array 입력을 판별해야 함', async () => {
    const file = await readFixture()

    const fileType = await Effect.runPromise(
      getFileTypeFromBuffer(new Uint8Array(file)),
    )

    expect(fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
  })

  it('ArrayBuffer 입력을 판별해야 함', async () => {
    const file = await readFixture()
    // 복사해 만든 Uint8Array의 buffer는 파일 내용만 담은 ArrayBuffer다.
    const arrayBuffer = new Uint8Array(file).buffer

    const fileType = await Effect.runPromise(getFileTypeFromBuffer(arrayBuffer))

    expect(fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
  })

  it('형식을 식별할 수 없으면 FileTypeFromBufferError로 실패해야 함', async () => {
    const result = await Effect.runPromise(
      Effect.either(getFileTypeFromBuffer(new TextEncoder().encode('hello'))),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(FileTypeFromBufferError)
      expect(result.left.message).toBe('파일 형식을 식별할 수 없습니다.')
    }
  })
})
