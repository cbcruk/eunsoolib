import { parseArgs } from 'node:util'
import type { JooljaOptions } from './joolja.types'

/** `joolja` 명령의 도움말. */
export const HELP = `이미지 크기를 측정하는 줄자

사용법
  joolja [dir] [options]

옵션
  -j, --json            result.json을 저장합니다
  -s, --scss            _variables.scss와 _sprite.scss를 저장합니다
  -w, --watch           변경을 감지해 다시 실행합니다
  -o, --out-dir <path>  저장 경로 (기본값: 측정한 디렉터리)
  -h, --help            도움말을 출력합니다
  -v, --version         버전을 출력합니다
`

/** {@linkcode parseCliArgs}가 돌려주는 실행 계획. */
export interface CliArgs extends JooljaOptions {
  /** 변경 감지 모드 여부. */
  watch: boolean
  /** 도움말만 출력하고 끝낼지 여부. 인자가 하나도 없을 때도 참이다. */
  help: boolean
  /** 버전만 출력하고 끝낼지 여부. */
  version: boolean
}

/**
 * `joolja` 명령의 인자를 실행 계획으로 바꾼다.
 *
 * 인자가 하나도 없으면 `help`가 참이다. 원래 CLI처럼 아무것도 하지 않고
 * 도움말을 보여 주기 위해서다.
 *
 * @param argv - `process.argv.slice(2)`
 * @returns 실행 계획
 * @throws 알 수 없는 옵션이 있을 때
 *
 * @example
 * ```ts
 * import { parseCliArgs } from '@cbcruk/joolja'
 *
 * parseCliArgs(['./assets', '--scss', '-o', './styles'])
 * // { dir: './assets', outDir: './styles', scss: true, ... }
 * ```
 */
export function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: 'boolean', short: 'j', default: false },
      scss: { type: 'boolean', short: 's', default: false },
      watch: { type: 'boolean', short: 'w', default: false },
      'out-dir': { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })

  return {
    dir: positionals[0],
    outDir: values['out-dir'],
    json: values.json,
    scss: values.scss,
    watch: values.watch,
    help: values.help || argv.length === 0,
    version: values.version,
  }
}
