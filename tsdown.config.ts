import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type UserConfig } from 'tsdown'

interface PackageJson {
  name: string
  private?: boolean
  exports: Record<string, string | Record<string, string>>
  eunsoolib: { category: string; runtime: string[] }
}

const packagesDir = path.resolve(import.meta.dirname, 'packages')
const invokedFrom = process.cwd()

/** exports의 소스 경로(`./src/react.tsx`)에서 빌드 entry(`{ react: 'src/react.tsx' }`)를 만든다. */
function entryFromExports(exports: PackageJson['exports']) {
  const entry: Record<string, string> = {}
  for (const [key, value] of Object.entries(exports)) {
    const source = typeof value === 'string' ? value : value.default
    if (!source?.startsWith('./src/')) continue
    const name = key === '.' ? 'index' : key.replace(/^\.\//, '')
    entry[name] = source.slice(2)
  }
  return entry
}

function platformOf(runtime: string[]): UserConfig['platform'] {
  if (runtime.length === 1 && runtime[0] === 'node') return 'node'
  if (runtime.length === 1 && runtime[0] === 'browser') return 'browser'
  return 'neutral'
}

const packages = readdirSync(packagesDir)
  .map((dir) => {
    const cwd = path.join(packagesDir, dir)
    const pkg = JSON.parse(
      readFileSync(path.join(cwd, 'package.json'), 'utf8'),
    ) as PackageJson
    return { cwd, pkg }
  })
  .filter(({ pkg }) => !pkg.private)
  // 패키지 폴더에서 실행하면(`pnpm -r build`) 그 패키지만 빌드한다.
  // 한 프로세스에서 전체를 빌드하면 d.ts 생성용 TypeScript 프로그램이 쌓여 메모리가 부족해진다.
  .filter(
    ({ cwd }) =>
      !invokedFrom.startsWith(packagesDir + path.sep) || invokedFrom === cwd,
  )

export default defineConfig(
  packages.map(({ cwd, pkg }) => ({
    name: pkg.name,
    cwd,
    entry: entryFromExports(pkg.exports),
    platform: platformOf(pkg.eunsoolib.runtime),
    format: 'esm',
    dts: true,
    clean: true,
    // 개발 중에는 exports가 src를 가리키고, 배포 시 publishConfig의 dist exports로 바뀐다.
    exports: { devExports: true },
    // package.json에 선언하지 않은 node_modules 의존성이 번들에 섞이면 빌드를 실패시킨다.
    deps: { onlyBundle: [] },
  })),
)
