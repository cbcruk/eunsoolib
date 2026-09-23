// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isRename, planRename, toTypeScriptPath } from './plan-rename'

describe('toTypeScriptPath', () => {
  it('JSX가 있으면 .tsx로 바꿔야 함', () => {
    expect(toTypeScriptPath('src/App.jsx', true)).toBe('src/App.tsx')
    expect(toTypeScriptPath('src/App.js', true)).toBe('src/App.tsx')
  })

  it('JSX가 없으면 .ts로 바꿔야 함', () => {
    expect(toTypeScriptPath('src/utils.js', false)).toBe('src/utils.ts')
  })

  it('경로 끝의 확장자만 바꿔야 함', () => {
    expect(toTypeScriptPath('src/js/utils.js', false)).toBe('src/js/utils.ts')
    expect(toTypeScriptPath('src/utils.js.js', false)).toBe('src/utils.js.ts')
  })
})

describe('planRename', () => {
  it('JSX를 담은 파일은 .tsx로 옮길 계획을 만들어야 함', () => {
    const plan = planRename('src/App.js', 'export default () => <div />')

    expect(plan).toEqual({ from: 'src/App.js', to: 'src/App.tsx' })
  })

  it('파싱하지 못하면 던지지 않고 이유를 돌려줘야 함', () => {
    const plan = planRename('src/broken.js', 'const a: number =')

    expect(isRename(plan)).toBe(false)
    expect(plan).toMatchObject({ file: 'src/broken.js' })
  })
})
