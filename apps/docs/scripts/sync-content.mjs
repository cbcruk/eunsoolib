#!/usr/bin/env node
// packages/*/README.md + package.json 메타데이터를 content/docs로 변환한다.
// README가 원본이고 content/docs는 생성물이라 git에 올리지 않는다.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = path.resolve(appDir, '../..')
const packagesDir = path.join(repoDir, 'packages')
const outDir = path.join(appDir, 'content/docs')
const GITHUB_BLOB = 'https://github.com/cbcruk/eunsoolib/blob/main'

/** CLAUDE.md의 category 규칙과 같은 순서·이름 */
const CATEGORIES = [
  ['react', 'React 컴포넌트·훅'],
  ['dom', 'DOM·CSS 브라우저 API'],
  ['state', '상태·저장소'],
  ['async', '비동기·서버'],
  ['auth', '인증·신원'],
  ['media', '이미지·미디어'],
  ['utils', '날짜·포맷 유틸'],
  ['devtools', '개발 도구'],
  ['lab', 'Lab (도메인 모델·게임)'],
]

const RUNTIME_LABELS = {
  universal: '범용',
  browser: '브라우저',
  node: 'Node',
  edge: 'Edge',
}

function readPackages() {
  return readdirSync(packagesDir)
    .filter((name) => existsSync(path.join(packagesDir, name, 'package.json')))
    .sort()
    .map((name) => {
      const dir = path.join(packagesDir, name)
      const pkg = JSON.parse(
        readFileSync(path.join(dir, 'package.json'), 'utf8'),
      )
      const readme = readFileSync(path.join(dir, 'README.md'), 'utf8')
      return { name, pkg, readme }
    })
}

/** 제목(H1)과 바로 아래 한 줄 설명은 frontmatter로 옮기므로 본문에서 뺀다. */
function stripHeader(markdown) {
  const lines = markdown.split('\n')
  let i = lines[0]?.startsWith('# ') ? 1 : 0
  while (i < lines.length && lines[i].trim() === '') i++
  while (
    i < lines.length &&
    lines[i].trim() !== '' &&
    !lines[i].startsWith('#')
  )
    i++
  return lines.slice(i).join('\n').replace(/^\n+/, '')
}

/** README 안의 상대 링크는 문서 사이트에서 깨지므로 GitHub 원본으로 바꾼다. */
function rewriteRelativeLinks(markdown, name) {
  return markdown.replace(
    /(!?\[[^\]]*\]\()(?!https?:|#|\/|mailto:)(\.\/)?([^)\s]+)(\))/g,
    (_match, open, _dot, target, close) =>
      `${open}${GITHUB_BLOB}/packages/${name}/${target}${close}`,
  )
}

function frontmatter(fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')
  return `---\n${body}\n---\n\n`
}

function write(file, content) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

const packages = readPackages()
rmSync(outDir, { recursive: true, force: true })

const rootPages = ['index']
const overview = []

for (const [category, label] of CATEGORIES) {
  const members = packages.filter((p) => p.pkg.eunsoolib?.category === category)
  if (members.length === 0) continue

  rootPages.push(category)
  write(
    path.join(outDir, category, 'meta.json'),
    JSON.stringify(
      { title: label, pages: members.map((p) => p.name), defaultOpen: true },
      null,
      2,
    ),
  )

  overview.push(
    `## ${label}`,
    '',
    '| 패키지 | 설명 | 실행 환경 |',
    '| --- | --- | --- |',
  )

  for (const { name, pkg, readme } of members) {
    const runtime = (pkg.eunsoolib.runtime ?? [])
      .map((r) => RUNTIME_LABELS[r] ?? r)
      .join(', ')
    write(
      path.join(outDir, category, `${name}.md`),
      frontmatter({ title: name, description: pkg.description ?? '' }) +
        rewriteRelativeLinks(stripHeader(readme), name),
    )
    overview.push(
      `| [${name}](/docs/${category}/${name}) | ${pkg.description ?? ''} | ${runtime} |`,
    )
  }
  overview.push('')
}

const uncategorized = packages.filter(
  (p) => !CATEGORIES.some(([c]) => c === p.pkg.eunsoolib?.category),
)
if (uncategorized.length > 0) {
  throw new Error(
    `eunsoolib.category가 없거나 알 수 없는 패키지: ${uncategorized.map((p) => p.name).join(', ')}`,
  )
}

write(
  path.join(outDir, 'index.md'),
  frontmatter({
    title: '패키지 목록',
    description: `예전에 쓰던 코드를 모아 둔 ${packages.length}개 패키지`,
  }) + overview.join('\n'),
)
write(
  path.join(outDir, 'meta.json'),
  JSON.stringify({ pages: rootPages }, null, 2),
)

console.log(
  `✓ ${packages.length}개 패키지 README → ${path.relative(repoDir, outDir)}`,
)
