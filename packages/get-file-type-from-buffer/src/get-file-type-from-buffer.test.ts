import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { getfileTypeFromBuffer } from './get-file-type-from-buffer'
import { readFile } from 'fs/promises'

test.skip('getfileTypeFromBuffer', async () => {
  const file = await readFile('packages/download-image/assets/image.jpg')
  const fileType = await Effect.runPromise(
    getfileTypeFromBuffer(Buffer.from(file)),
  )

  expect(fileType).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
})
