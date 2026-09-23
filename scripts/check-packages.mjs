#!/usr/bin/env node
// 배포 대상 패키지를 실제로 `pnpm pack`한 tarball로 검사한다.
// publishConfig 치환과 workspace: 프로토콜 변환은 pack 시점에 일어나므로
// 소스 package.json이 아니라 tarball을 봐야 npm에 올라갈 모습을 검사할 수 있다.
// 먼저 `pnpm build`로 dist를 만들어야 한다.

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repoDir = path.resolve(import.meta.dirname, '..')
const packagesDir = path.join(repoDir, 'packages')
const bin = (name) => path.join(repoDir, 'node_modules/.bin', name)

const only = process.argv.slice(2)
const packages = readdirSync(packagesDir)
  .filter((dir) => only.length === 0 || only.includes(dir))
  .map((dir) => ({
    dir: path.join(packagesDir, dir),
    pkg: JSON.parse(
      readFileSync(path.join(packagesDir, dir, 'package.json'), 'utf8'),
    ),
  }))
  .filter(({ pkg }) => !pkg.private)

const outDir = mkdtempSync(path.join(tmpdir(), 'check-packages-'))
const failures = []

function run(command, args, cwd) {
  try {
    execFileSync(command, args, { cwd, stdio: 'pipe', encoding: 'utf8' })
    return null
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
  }
}

/** 배포 메타데이터가 폴더명·카테고리와 맞는지 확인한다. */
function checkMetadata(dir, pkg) {
  const name = path.basename(dir)
  const category = pkg.eunsoolib?.category
  const expected = {
    name: `@cbcruk/${name}`,
    license: 'MIT',
    homepage: `https://cbcruk.github.io/eunsoolib/docs/${category}/${name}/`,
    'repository.directory': `packages/${name}`,
    files: JSON.stringify(['dist']),
    'publishConfig.access': 'public',
  }
  const actual = {
    name: pkg.name,
    license: pkg.license,
    homepage: pkg.homepage,
    'repository.directory': pkg.repository?.directory,
    files: JSON.stringify(pkg.files),
    'publishConfig.access': pkg.publishConfig?.access,
  }
  return Object.keys(expected)
    .filter((key) => actual[key] !== expected[key])
    .map((key) => `${key}: ${actual[key]} (기대값 ${expected[key]})`)
}

for (const { dir, pkg } of packages) {
  const problems = checkMetadata(dir, pkg)

  if (!existsSync(path.join(dir, 'dist'))) {
    problems.push('dist가 없습니다. `pnpm build`를 먼저 실행하세요.')
  } else {
    execFileSync('pnpm', ['pack', '--pack-destination', outDir], {
      cwd: dir,
      stdio: 'pipe',
    })
    const tarball = path.join(
      outDir,
      `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`,
    )

    const packed = JSON.parse(
      execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], {
        encoding: 'utf8',
      }),
    )
    const deps = { ...packed.dependencies, ...packed.peerDependencies }
    for (const [name, range] of Object.entries(deps)) {
      if (range.startsWith('workspace:')) {
        problems.push(`${name}: ${range}가 버전으로 치환되지 않았습니다.`)
      }
    }

    const files = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    if (files.some((file) => file.startsWith('package/src/'))) {
      problems.push('tarball에 src/가 포함됐습니다.')
    }

    // attw는 타입이 아예 없는 패키지를 문제로 보지 않으므로 직접 확인한다.
    for (const [key, target] of Object.entries(packed.exports ?? {})) {
      if (typeof target !== 'string' || !target.endsWith('.js')) continue
      const declaration = `package/${target.slice(2, -3)}.d.ts`
      if (!files.includes(declaration)) {
        problems.push(
          `exports["${key}"]의 타입 선언 ${declaration}이 없습니다.`,
        )
      }
    }

    // bin은 npm이 설치 시 심볼릭 링크를 걸기 때문에, 파일이 없거나 셰뱅이 빠지면 설치 후에야 드러난다.
    for (const [command, target] of Object.entries(packed.bin ?? {})) {
      const entry = `package/${target.replace(/^\.\//, '')}`
      if (!files.includes(entry)) {
        problems.push(`bin["${command}"]의 실행 파일 ${entry}이 없습니다.`)
        continue
      }
      const source = execFileSync('tar', ['-xzOf', tarball, entry], {
        encoding: 'utf8',
      })
      if (!source.startsWith('#!')) {
        problems.push(`bin["${command}"]의 ${entry}에 셰뱅이 없습니다.`)
      }
    }

    const publint = run(bin('publint'), ['run', tarball, '--strict'], repoDir)
    if (publint) problems.push(`publint\n${publint}`)

    const attw = run(
      bin('attw'),
      [tarball, '--profile', 'esm-only', '--format', 'ascii', '--no-color'],
      repoDir,
    )
    if (attw) problems.push(`attw\n${attw}`)
  }

  if (problems.length > 0) {
    failures.push(pkg.name)
    console.log(`✗ ${pkg.name}\n  ${problems.join('\n  ')}`)
  } else {
    console.log(`✓ ${pkg.name}`)
  }
}

rmSync(outDir, { recursive: true, force: true })

if (failures.length > 0) {
  console.error(
    `\n${failures.length}개 패키지 검사 실패: ${failures.join(', ')}`,
  )
  process.exit(1)
}
console.log(`\n✓ ${packages.length}개 패키지 모두 통과`)
