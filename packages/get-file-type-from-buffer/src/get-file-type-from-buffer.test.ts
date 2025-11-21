import { Effect } from 'effect/index'
import { expect, test } from 'vitest'
import { getfileTypeFromBuffer } from './get-file-type-from-buffer'
import { readFile } from 'fs/promises'
import { NodeContext } from '@effect/platform-node/index'

test.skip('getfileTypeFromBuffer', async () => {
  const file = await readFile('packages/download-image/assets/image.jpg')
  const fileType = await Effect.runPromise(
    getfileTypeFromBuffer(Buffer.from(file)).pipe(
      Effect.provide(NodeContext.layer)
    )
  )

  expect(fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
})
