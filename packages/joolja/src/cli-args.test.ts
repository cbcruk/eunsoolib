// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseCliArgs } from './cli-args'

describe('parseCliArgs', () => {
  it('인자가 없으면 도움말만 출력하도록 해야 함', () => {
    expect(parseCliArgs([])).toMatchObject({ help: true })
  })

  it('첫 위치 인자를 측정 대상 디렉터리로 읽어야 함', () => {
    expect(parseCliArgs(['./assets'])).toMatchObject({
      dir: './assets',
      help: false,
    })
  })

  it('짧은 옵션과 긴 옵션을 같게 다뤄야 함', () => {
    expect(parseCliArgs(['-j', '-s', '-w', '-o', './styles'])).toMatchObject({
      json: true,
      scss: true,
      watch: true,
      outDir: './styles',
    })
    expect(
      parseCliArgs(['--json', '--scss', '--watch', '--out-dir', './styles']),
    ).toMatchObject({
      json: true,
      scss: true,
      watch: true,
      outDir: './styles',
    })
  })

  it('저장 경로를 지정하지 않으면 outDir이 비어 있어야 함', () => {
    expect(parseCliArgs(['--json']).outDir).toBeUndefined()
  })

  it('알 수 없는 옵션은 던져야 함', () => {
    expect(() => parseCliArgs(['--sass'])).toThrow()
  })
})
