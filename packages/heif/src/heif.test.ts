import { describe, it, expect } from 'vitest'
import { processImageFile } from './heif'

describe('processImageFile', () => {
  it('HEIF가 아닌 파일은 변환 없이 그대로 반환', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' })

    const result = await processImageFile(file)

    expect(result).toBe(file)
  })
})
