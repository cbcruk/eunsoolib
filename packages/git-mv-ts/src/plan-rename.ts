import { hasJsx } from './has-jsx'
import type { Rename, SkippedFile } from './git-mv-ts.types'

/**
 * 이름을 바꿀 대상 확장자.
 *
 * `.mjs`와 `.cjs`는 다루지 않는다. JSX는 `.tsx`에서만 쓸 수 있어 `.mts`/`.cts`로
 * 옮길 수 없는 경우가 생기기 때문이다.
 */
export const SOURCE_EXTENSIONS = ['.js', '.jsx']

/**
 * 파일 경로의 확장자를 JSX 유무에 맞는 타입스크립트 확장자로 바꾼다.
 *
 * 경로 끝의 확장자 하나만 바꾼다. 중간에 있는 `.js`는 건드리지 않는다.
 *
 * @param file - 원래 파일 경로
 * @param jsx - JSX를 담고 있는지 여부
 * @returns 바뀐 파일 경로
 *
 * @example
 * ```ts
 * import { toTypeScriptPath } from '@cbcruk/git-mv-ts'
 *
 * toTypeScriptPath('src/App.jsx', true)      // 'src/App.tsx'
 * toTypeScriptPath('src/utils.js.js', false) // 'src/utils.js.ts'
 * ```
 */
export function toTypeScriptPath(file: string, jsx: boolean): string {
  return file.replace(/\.jsx?$/, jsx ? '.tsx' : '.ts')
}

/**
 * 소스를 읽어 파일 하나의 이름 변경 계획을 만든다.
 *
 * 파싱하지 못하면 던지지 않고 건너뛸 이유를 돌려준다. 파일 하나가 깨졌다고
 * 전체 작업을 멈추지 않기 위해서다.
 *
 * @param file - 파일 경로
 * @param source - 파일 내용
 * @returns 이름 변경 계획, 또는 건너뛸 이유
 */
export function planRename(file: string, source: string): Rename | SkippedFile {
  try {
    return { from: file, to: toTypeScriptPath(file, hasJsx(source)) }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    return { file, reason }
  }
}

/** 값이 {@linkcode Rename}인지 {@linkcode SkippedFile}인지 가린다. */
export function isRename(value: Rename | SkippedFile): value is Rename {
  return 'from' in value
}
