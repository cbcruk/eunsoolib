#!/usr/bin/env node
// packages/*/README.md가 scripts/templates/README.md의 규칙을 따르는지 검사한다.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = path.join(root, 'packages')
const REQUIRED_SECTIONS = ['설치', '사용법', 'API']
const FORBIDDEN_SECTIONS = /^(license|라이선스)$/i

function headingsOf(markdown) {
  const headings = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) continue
    const match = /^(#{1,6})\s+(.*?)\s*$/.exec(line)
    if (match) headings.push({ level: match[1].length, text: match[2] })
  }
  return headings
}

function check(name) {
  const dir = path.join(packagesDir, name)
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const readmePath = path.join(dir, 'README.md')
  if (!existsSync(readmePath)) return ['README.md가 없음']

  const markdown = readFileSync(readmePath, 'utf8')
  const problems = []
  const lines = markdown.split('\n')

  if (lines[0] !== `# ${pkg.name}`) {
    problems.push(`제목이 "# ${pkg.name}"가 아님: "${lines[0]}"`)
  }

  const intro = lines.slice(1).find((line) => line.trim() !== '')
  if (!intro || intro.startsWith('#')) {
    problems.push('제목 아래 한 줄 설명이 없음')
  }

  const h2 = headingsOf(markdown)
    .filter((h) => h.level === 2)
    .map((h) => h.text)

  let cursor = -1
  for (const section of REQUIRED_SECTIONS) {
    const index = h2.indexOf(section)
    if (index === -1) {
      problems.push(`"## ${section}" 섹션이 없음`)
    } else if (index < cursor) {
      problems.push(
        `"## ${section}" 섹션 순서가 ${REQUIRED_SECTIONS.join(' → ')}가 아님`,
      )
    } else {
      cursor = index
    }
  }

  for (const text of h2) {
    if (FORBIDDEN_SECTIONS.test(text))
      problems.push(`"## ${text}" 섹션은 두지 않음`)
  }

  return problems
}

const names = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) =>
    existsSync(path.join(packagesDir, entry.name, 'package.json')),
  )
  .map((entry) => entry.name)
  .sort()

let failed = 0
for (const name of names) {
  const problems = check(name)
  if (problems.length === 0) continue
  failed++
  console.log(`✗ ${name}`)
  for (const problem of problems) console.log(`  - ${problem}`)
}

console.log(
  failed === 0
    ? `✓ ${names.length}개 패키지 README 모두 통과`
    : `\n${failed}/${names.length}개 패키지 README에 문제가 있음`,
)
process.exit(failed === 0 ? 0 : 1)
