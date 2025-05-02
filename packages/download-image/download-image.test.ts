import { test } from 'vitest'
import { downloadImage } from './download-image.js'

test('downloadImage', async () => {
  await downloadImage({
    url: 'https://avatars.githubusercontent.com/u/7017895?v=4',
    dest: 'packages/download-image/assets',
  })
})
