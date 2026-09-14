import { Data, Effect, Option } from 'effect'
import { fileTypeFromBuffer } from 'file-type'

type GetFileTypeFromBufferParam = Uint8Array | ArrayBuffer

/**
 * 파일 형식 판별에 실패했을 때 발생하는 태그드 에러
 *
 * 판별 과정에서 예외가 났거나(`cause` 포함), 형식을 식별하지 못한 경우 모두
 * 이 에러로 표현된다.
 */
export class FileTypeFromBufferError extends Data.TaggedError(
  'FileTypeFromBufferError',
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * 버퍼의 매직 넘버를 읽어 파일 형식(MIME 타입/확장자)을 판별
 *
 * 확장자나 파일명이 아니라 실제 바이트를 보고 판단하므로 업로드된 파일을
 * 검증할 때 쓸 수 있다.
 *
 * @param buffer - 검사할 파일의 바이너리. Node `Buffer`는 `Uint8Array`이므로 그대로 넘길 수 있다.
 * @returns 성공 시 `{ ext, mime }`, 실패 시 {@link FileTypeFromBufferError}를
 * 담은 Effect
 * @example
 * ```ts
 * import { Effect } from 'effect'
 * import { getFileTypeFromBuffer } from '@cbcruk/get-file-type-from-buffer'
 *
 * const program = getFileTypeFromBuffer(buffer)
 * const { ext, mime } = await Effect.runPromise(program)
 * ```
 */
export const getFileTypeFromBuffer = (buffer: GetFileTypeFromBufferParam) =>
  Effect.gen(function* () {
    const fileType = yield* Effect.tryPromise({
      try: () => fileTypeFromBuffer(buffer),
      catch: (e) =>
        new FileTypeFromBufferError({
          message: '파일 형식 판별 중 오류 발생',
          cause: e,
        }),
    })

    return yield* Option.fromNullable(fileType).pipe(
      Option.match({
        onSome: (fileType) => Effect.succeed(fileType),
        onNone: () =>
          Effect.fail(
            new FileTypeFromBufferError({
              message: '파일 형식을 식별할 수 없습니다.',
            }),
          ),
      }),
    )
  })

/** @deprecated 오타가 있는 이전 이름. {@link getFileTypeFromBuffer}를 사용 */
export const getfileTypeFromBuffer = getFileTypeFromBuffer
