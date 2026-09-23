import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { GitMvTsOptions, GitMvTsResult } from './git-mv-ts.types'
import { gitMv, listTrackedSources } from './git'
import { isRename, planRename } from './plan-rename'

/**
 * git이 추적 중인 `.js`·`.jsx` 파일을 JSX 유무에 따라 `.ts`·`.tsx`로 옮긴다.
 *
 * 내용은 바꾸지 않고 이름만 바꾼다. 파싱하지 못하거나 `git mv`가 거부한 파일은
 * 건너뛰고 나머지를 계속 옮긴 뒤, 결과에 이유와 함께 담아 돌려준다.
 *
 * @param options - 실행 디렉터리, 대상 경로, 드라이런 여부
 * @returns 옮긴 파일과 건너뛴 파일
 * @throws git 저장소가 아닐 때
 *
 * @example
 * ```ts
 * import { gitMvTs } from '@cbcruk/git-mv-ts'
 *
 * const { renamed, skipped } = await gitMvTs({ paths: ['src'], dryRun: true })
 * ```
 */
export async function gitMvTs(
  options: GitMvTsOptions = {},
): Promise<GitMvTsResult> {
  const cwd = options.cwd ?? process.cwd()
  const files = await listTrackedSources(cwd, options.paths)
  const result: GitMvTsResult = { renamed: [], skipped: [] }

  for (const file of files) {
    const source = await readFile(path.join(cwd, file), 'utf8')
    const plan = planRename(file, source)

    if (!isRename(plan)) {
      result.skipped.push(plan)
      continue
    }

    if (options.dryRun) {
      result.renamed.push(plan)
      continue
    }

    try {
      await gitMv(cwd, plan.from, plan.to)
      result.renamed.push(plan)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      result.skipped.push({ file, reason })
    }
  }

  return result
}
