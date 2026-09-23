// @vitest-environment node
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { gitMvTs } from './git-mv-ts'

const run = promisify(execFile)
const repos: string[] = []

/** 파일 몇 개를 커밋한 임시 git 저장소를 만든다. */
async function createRepo(files: Record<string, string>): Promise<string> {
  const cwd = await mkdtemp(path.join(tmpdir(), 'git-mv-ts-'))
  repos.push(cwd)

  await run('git', ['init', '-q', '-b', 'main'], { cwd })
  await run('git', ['config', 'user.email', 'test@example.com'], { cwd })
  await run('git', ['config', 'user.name', 'test'], { cwd })

  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.join(cwd, path.dirname(file)), { recursive: true })
    await writeFile(path.join(cwd, file), content)
  }

  await run('git', ['add', '-A'], { cwd })
  await run('git', ['commit', '-qm', 'init'], { cwd })

  return cwd
}

async function trackedFiles(cwd: string): Promise<string[]> {
  const { stdout } = await run('git', ['ls-files'], { cwd })
  return stdout.split('\n').filter(Boolean).sort()
}

afterEach(async () => {
  await Promise.all(
    repos.splice(0).map((cwd) => rm(cwd, { recursive: true, force: true })),
  )
})

describe('gitMvTs', () => {
  it('JSX 유무에 따라 .ts와 .tsx로 나눠 옮겨야 함', async () => {
    const cwd = await createRepo({
      'src/App.js': 'export default () => <div />',
      'src/utils.js': 'export const sum = (a, b) => a + b',
    })

    const { renamed, skipped } = await gitMvTs({ cwd })

    expect(skipped).toEqual([])
    expect(renamed).toEqual([
      { from: 'src/App.js', to: 'src/App.tsx' },
      { from: 'src/utils.js', to: 'src/utils.ts' },
    ])
    expect(await trackedFiles(cwd)).toEqual(['src/App.tsx', 'src/utils.ts'])
  })

  it('dryRun이면 계획만 만들고 파일은 그대로여야 함', async () => {
    const cwd = await createRepo({ 'src/utils.js': 'export const a = 1' })

    const { renamed } = await gitMvTs({ cwd, dryRun: true })

    expect(renamed).toEqual([{ from: 'src/utils.js', to: 'src/utils.ts' }])
    expect(await trackedFiles(cwd)).toEqual(['src/utils.js'])
  })

  it('paths로 지정한 경로만 옮겨야 함', async () => {
    const cwd = await createRepo({
      'src/a.js': 'export const a = 1',
      'scripts/b.js': 'export const b = 2',
    })

    const { renamed } = await gitMvTs({ cwd, paths: ['src'] })

    expect(renamed).toEqual([{ from: 'src/a.js', to: 'src/a.ts' }])
    expect(await trackedFiles(cwd)).toEqual(['scripts/b.js', 'src/a.ts'])
  })

  it('추적하지 않는 파일은 건드리지 않아야 함', async () => {
    const cwd = await createRepo({ 'src/a.js': 'export const a = 1' })
    await mkdir(path.join(cwd, 'node_modules/dep'), { recursive: true })
    await writeFile(
      path.join(cwd, 'node_modules/dep/index.js'),
      'module.exports = 1',
    )

    const { renamed } = await gitMvTs({ cwd })

    expect(renamed).toEqual([{ from: 'src/a.js', to: 'src/a.ts' }])
  })

  it('파싱하지 못하는 파일은 건너뛰고 나머지를 계속 옮겨야 함', async () => {
    const cwd = await createRepo({
      'src/a.js': 'export const a = 1',
      'src/broken.js': 'export const b = @decorator',
    })

    const { renamed, skipped } = await gitMvTs({ cwd })

    expect(renamed).toEqual([{ from: 'src/a.js', to: 'src/a.ts' }])
    expect(skipped).toHaveLength(1)
    expect(skipped[0].file).toBe('src/broken.js')
    expect(await trackedFiles(cwd)).toEqual(['src/a.ts', 'src/broken.js'])
  })

  it('공백이 있는 파일 이름도 옮겨야 함', async () => {
    const cwd = await createRepo({
      'src/my component.js': 'export default () => <p />',
    })

    const { renamed } = await gitMvTs({ cwd })

    expect(renamed).toEqual([
      { from: 'src/my component.js', to: 'src/my component.tsx' },
    ])
    expect(await trackedFiles(cwd)).toEqual(['src/my component.tsx'])
  })
})
