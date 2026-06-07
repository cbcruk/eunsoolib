import type { HeifOutputType } from './types'

/** `.heic` / `.heif` 확장자 매칭 (대소문자 무시). */
const HEIF_EXTENSION = /\.hei[cf]$/i

const MIME_EXTENSION: Record<HeifOutputType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** 파일명이 HEIF(`.heic`/`.heif`) 확장자를 가지는지 여부. */
export function isHeifFile(file: File): boolean {
  return HEIF_EXTENSION.test(file.name)
}

/** HEIF 확장자를 `extension`으로 치환한 파일명을 반환. */
export function toOutputFilename(name: string, extension: string): string {
  return name.replace(HEIF_EXTENSION, `.${extension}`)
}

/** 출력 MIME 타입에 대응하는 파일 확장자. */
export function extensionForMime(type: HeifOutputType): string {
  return MIME_EXTENSION[type]
}
