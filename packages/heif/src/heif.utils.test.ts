import { describe, it, expect } from 'vitest'
import { isHeifFile, toOutputFilename, extensionForMime } from './heif.utils'

const fileNamed = (name: string): File => new File([], name)

describe('isHeifFile', () => {
  it('.heic / .heif 확장자를 대소문자 무시하고 인식', () => {
    expect(isHeifFile(fileNamed('photo.heic'))).toBe(true)
    expect(isHeifFile(fileNamed('photo.HEIF'))).toBe(true)
    expect(isHeifFile(fileNamed('IMG_0001.Heic'))).toBe(true)
  })

  it('HEIF가 아닌 확장자는 false', () => {
    expect(isHeifFile(fileNamed('photo.jpg'))).toBe(false)
    expect(isHeifFile(fileNamed('photo.png'))).toBe(false)
    expect(isHeifFile(fileNamed('heic.txt'))).toBe(false)
  })
})

describe('toOutputFilename', () => {
  it('HEIF 확장자를 주어진 확장자로 치환', () => {
    expect(toOutputFilename('photo.heic', 'jpg')).toBe('photo.jpg')
    expect(toOutputFilename('IMG.HEIF', 'webp')).toBe('IMG.webp')
  })

  it('확장자가 아닌 위치의 hei[cf] 패턴은 건드리지 않음', () => {
    expect(toOutputFilename('heicfile.heic', 'jpg')).toBe('heicfile.jpg')
  })
})

describe('extensionForMime', () => {
  it('MIME 타입을 파일 확장자로 매핑', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/png')).toBe('png')
    expect(extensionForMime('image/webp')).toBe('webp')
  })
})
