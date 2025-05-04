import { expect, test } from 'vitest'
import { getDimensions } from './image-size'
import { readFile } from 'fs/promises'

test('getDimmension', async () => {
  const file = await readFile('packages/download-image/assets/image.jpg')
  const dimmension = await getDimensions(file)

  expect(dimmension).toEqual({ height: 139, width: 139, type: 'jpg' })
})
