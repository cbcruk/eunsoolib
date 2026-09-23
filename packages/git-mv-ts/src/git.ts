import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { SOURCE_EXTENSIONS } from './plan-rename'

const run = promisify(execFile)

/**
 * git이 추적 중인 `.js`·`.jsx` 파일 목록을 가져온다.
 *
 * `git ls-files`를 쓰므로 `.gitignore` 대상과 `node_modules`, 추적하지 않는
 * 파일은 처음부터 빠진다.
 *
 * @param cwd - 명령을 실행할 디렉터리
 * @param paths - 대상을 좁힐 경로 목록. 비우면 저장소 전체
 * @returns 저장소 루트 기준 상대 경로 목록
 * @throws git 저장소가 아니거나 git 실행에 실패할 때
 */
export async function listTrackedSources(
  cwd: string,
  paths: string[] = [],
): Promise<string[]> {
  const patterns = SOURCE_EXTENSIONS.flatMap((extension) =>
    paths.length === 0
      ? [`*${extension}`]
      : paths.map((base) => `${base}/*${extension}`),
  )
  const { stdout } = await run('git', ['ls-files', '-z', '--', ...patterns], {
    cwd,
  })

  return stdout.split('\0').filter(Boolean)
}

/**
 * `git mv`로 파일 이름을 바꾼다.
 *
 * 인자를 셸에 넘기지 않으므로 공백이 있는 경로도 그대로 다룬다.
 *
 * @param cwd - 명령을 실행할 디렉터리
 * @param from - 원래 경로
 * @param to - 바꿀 경로
 * @throws 대상이 이미 있거나 git이 거부할 때
 */
export async function gitMv(
  cwd: string,
  from: string,
  to: string,
): Promise<void> {
  await run('git', ['mv', from, to], { cwd })
}
