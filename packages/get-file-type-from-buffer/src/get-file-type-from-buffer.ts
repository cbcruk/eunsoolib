import { Data, Effect, Option } from 'effect/index'
import { fileTypeFromBuffer } from 'file-type'

type GetfileTypeFromBufferParam = Buffer

export class FileTypeFromBufferError extends Data.TaggedError(
  'FileTypeFromBufferError'
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export const getfileTypeFromBuffer = (buffer: GetfileTypeFromBufferParam) =>
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
            })
          ),
      })
    )
  })
