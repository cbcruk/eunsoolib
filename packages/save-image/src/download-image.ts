import { Cause, Data, Effect, Exit } from 'effect'
import {
  FileSystem,
  HttpClient,
  HttpClientResponse,
  FetchHttpClient,
} from '@effect/platform'
import { getFileTypeFromBuffer } from '@cbcruk/get-file-type-from-buffer'
import { NodeContext } from '@effect/platform-node'

/**
 * 이미지 다운로드·저장 과정의 실패를 나타내는 태그드 에러.
 *
 * 요청 실패, 2xx가 아닌 HTTP 상태, 본문 읽기 실패, 형식 판별 실패, 파일 저장
 * 실패를 모두 이 에러로 표현하며, 원래 에러는 `cause`에 담는다.
 */
export class DownloadImageError extends Data.TaggedError('DownloadImageError')<{
  /** 실패한 단계를 설명하는 메시지 */
  readonly message: string
  /** 원인이 된 하위 에러 (`HttpClientError`, `PlatformError` 등) */
  readonly cause?: unknown
}> {}

/** {@link downloadImage}와 {@link downloadImageEffect}의 인자. */
export interface DownloadImageParams {
  /** 내려받을 이미지 URL */
  url: string
  /** 저장할 디렉터리 경로. 없으면 재귀적으로 생성한다 */
  dest: string
  /**
   * 확장자를 뺀 파일명. 확장자는 응답 바이트로 판별해 붙인다.
   *
   * 같은 `dest`에 같은 파일명으로 다시 받으면 기존 파일을 덮어쓴다.
   *
   * @default 'image'
   */
  filename?: string
}

/**
 * URL의 이미지를 내려받아 `<dest>/<filename>.<확장자>`로 저장하는 Effect를 만든다.
 *
 * 확장자는 응답 바이트의 매직 넘버로 판별한다. 2xx가 아닌 응답은 저장하지 않고
 * 실패로 처리한다. 필요한 `FileSystem`과 `HttpClient`는 호출하는 쪽에서 제공하므로
 * 다른 Effect와 조합하거나 테스트에서 가짜 구현으로 바꿀 수 있다.
 *
 * @returns 저장한 파일 경로로 성공하고, 어느 단계에서든 실패하면
 * {@link DownloadImageError}로 실패하는 Effect
 * @example
 * ```ts
 * import { Effect } from 'effect'
 * import { FetchHttpClient } from '@effect/platform'
 * import { NodeContext } from '@effect/platform-node'
 * import { downloadImageEffect } from '@cbcruk/save-image'
 *
 * const filePath = await downloadImageEffect({
 *   url: 'https://example.com/avatar',
 *   dest: 'assets',
 *   filename: 'avatar',
 * }).pipe(
 *   Effect.provide(NodeContext.layer),
 *   Effect.provide(FetchHttpClient.layer),
 *   Effect.runPromise,
 * )
 * // 'assets/avatar.png'
 * ```
 */
export const downloadImageEffect = ({
  url,
  dest,
  filename = 'image',
}: DownloadImageParams): Effect.Effect<
  string,
  DownloadImageError,
  FileSystem.FileSystem | HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(url).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.mapError(
        (cause) =>
          new DownloadImageError({
            message:
              cause._tag === 'ResponseError'
                ? `이미지 요청이 HTTP ${cause.response.status}로 실패했습니다: ${url}`
                : `이미지 요청에 실패했습니다: ${url}`,
            cause,
          }),
      ),
    )

    const buffer = Buffer.from(
      yield* response.arrayBuffer.pipe(
        Effect.mapError(
          (cause) =>
            new DownloadImageError({
              message: `응답 본문을 읽지 못했습니다: ${url}`,
              cause,
            }),
        ),
      ),
    )

    const fileType = yield* getFileTypeFromBuffer(buffer).pipe(
      Effect.mapError(
        (cause) =>
          new DownloadImageError({
            message: `이미지 형식을 판별하지 못했습니다: ${url}`,
            cause,
          }),
      ),
    )

    const filePath = `${dest}/${filename}.${fileType.ext}`

    yield* fs.makeDirectory(dest, { recursive: true }).pipe(
      Effect.zipRight(fs.writeFile(filePath, buffer)),
      Effect.mapError(
        (cause) =>
          new DownloadImageError({
            message: `파일을 저장하지 못했습니다: ${filePath}`,
            cause,
          }),
      ),
    )

    return filePath
  })

/**
 * URL의 이미지를 내려받아 `<dest>/<filename>.<확장자>`로 저장하고 경로를 돌려준다.
 *
 * {@link downloadImageEffect}에 Node 파일 시스템과 전역 `fetch` 기반 HTTP
 * 클라이언트를 제공해 실행하는 Promise 래퍼다.
 *
 * @returns 저장한 파일 경로로 resolve되는 Promise
 * @throws 어느 단계에서든 실패하면 {@link DownloadImageError}로 reject한다
 * @example
 * ```ts
 * import { downloadImage, DownloadImageError } from '@cbcruk/save-image'
 *
 * try {
 *   const filePath = await downloadImage({
 *     url: 'https://example.com/avatar',
 *     dest: 'assets',
 *     filename: 'avatar',
 *   })
 *   console.log(filePath) // 'assets/avatar.png'
 * } catch (error) {
 *   if (error instanceof DownloadImageError) {
 *     console.error(error.message, error.cause)
 *   }
 * }
 * ```
 */
export const downloadImage = async (
  params: DownloadImageParams,
): Promise<string> => {
  const exit = await downloadImageEffect(params).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(FetchHttpClient.layer),
    Effect.runPromiseExit,
  )

  if (Exit.isSuccess(exit)) {
    return exit.value
  }

  throw Cause.squash(exit.cause)
}
