import { Data, Effect } from 'effect'
import { FileSystem, HttpClient, FetchHttpClient } from '@effect/platform'
import { getfileTypeFromBuffer } from '../get-file-type-from-buffer/get-file-type-from-buffer'
import { NodeContext } from '@effect/platform-node/index'

export class DownloadImageError extends Data.TaggedError('DownloadImageError')<{
  readonly message: string
  readonly cause?: unknown
}> {}

type DownloadImageParams = {
  /** 이미지 URL */
  url: string
  /** 저장 경로 (전체 파일 경로) */
  dest: string
}

export const downloadImage = ({ url, dest }: DownloadImageParams) => {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient

    yield* fs.makeDirectory(dest, { recursive: true })

    const response = yield* client.get(url)
    const buffer = Buffer.from(yield* response.arrayBuffer)
    const fileType = yield* getfileTypeFromBuffer(buffer)
    const filePath = `${dest}/image.${fileType.ext}`

    yield* fs.writeFile(filePath, buffer)

    return filePath
  }).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.match({
      onSuccess(filePath) {
        console.log(`✅ 저장됨 - ${filePath}`)
      },
      onFailure(error) {
        console.error('❌', error.message)
      },
    }),
    Effect.runPromise
  )
}
