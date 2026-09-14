import { Data, Effect } from 'effect'
import { FileSystem, HttpClient, FetchHttpClient } from '@effect/platform'
import { getFileTypeFromBuffer } from '@cbcruk/get-file-type-from-buffer'
import { NodeContext } from '@effect/platform-node'

/** 이미지 다운로드·저장 과정의 실패를 나타내는 태그드 에러. */
export class DownloadImageError extends Data.TaggedError('DownloadImageError')<{
  readonly message: string
  readonly cause?: unknown
}> {}

type DownloadImageParams = {
  /** 이미지 URL */
  url: string
  /** 저장할 디렉터리 경로. 없으면 재귀적으로 생성한다 */
  dest: string
}

/**
 * URL의 이미지를 내려받아 `dest` 디렉터리에 `image.<확장자>`로 저장한다.
 *
 * 확장자는 응답 바이트의 매직 넘버로 판별한다. Node 파일 시스템과 `fetch` 기반
 * HTTP 클라이언트를 내부에서 제공한 뒤 Effect를 바로 실행하며, 결과는 콘솔에
 * 로그로 남긴다. Effect 에러 채널의 실패는 reject하지 않고 에러 메시지만 출력한다.
 *
 * @returns 저장 또는 실패 로그 출력이 끝나면 resolve 되는 Promise
 * @example
 * ```ts
 * import { downloadImage } from '@cbcruk/download-image'
 *
 * await downloadImage({
 *   url: 'https://example.com/avatar',
 *   dest: 'assets/avatar',
 * })
 * // ✅ 저장됨 - assets/avatar/image.png
 * ```
 */
export const downloadImage = ({ url, dest }: DownloadImageParams) => {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient

    yield* fs.makeDirectory(dest, { recursive: true })

    const response = yield* client.get(url)
    const buffer = Buffer.from(yield* response.arrayBuffer)
    const fileType = yield* getFileTypeFromBuffer(buffer)
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
    Effect.runPromise,
  )
}
