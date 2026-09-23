import { parseArgs } from 'node:util'
import type { GitMvTsOptions } from './git-mv-ts.types'

/** `git-mv-ts` 명령의 도움말. */
export const HELP = `.js/.jsx 파일을 JSX 유무에 따라 .ts/.tsx로 옮깁니다

사용법
  git-mv-ts [paths...] [options]

옵션
  -n, --dry-run   옮기지 않고 무엇이 바뀔지만 보여 줍니다
  -h, --help      도움말을 출력합니다
  -v, --version   버전을 출력합니다

paths를 주지 않으면 저장소 전체를 대상으로 합니다.
git이 추적하는 파일만 다루므로 node_modules와 .gitignore 대상은 제외됩니다.
`

/** {@linkcode parseCliArgs}가 돌려주는 실행 계획. */
export interface CliArgs extends GitMvTsOptions {
  /** 도움말만 출력하고 끝낼지 여부. */
  help: boolean
  /** 버전만 출력하고 끝낼지 여부. */
  version: boolean
}

/**
 * `git-mv-ts` 명령의 인자를 실행 계획으로 바꾼다.
 *
 * @param argv - `process.argv.slice(2)`
 * @returns 실행 계획
 * @throws 알 수 없는 옵션이 있을 때
 *
 * @example
 * ```ts
 * import { parseCliArgs } from '@cbcruk/git-mv-ts'
 *
 * parseCliArgs(['src', 'app', '--dry-run'])
 * // { paths: ['src', 'app'], dryRun: true, help: false, version: false }
 * ```
 */
export function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', short: 'n', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })

  return {
    paths: positionals,
    dryRun: values['dry-run'],
    help: values.help,
    version: values.version,
  }
}
