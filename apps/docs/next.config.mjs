import path from 'node:path'
import { createMDX } from 'fumadocs-mdx/next'

const repoRoot = path.resolve(import.meta.dirname, '../..')

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  // GitHub Pages 등 하위 경로 배포 시 DOCS_BASE_PATH=/eunsoolib
  basePath: process.env.DOCS_BASE_PATH || undefined,
  trailingSlash: true,
  reactStrictMode: true,
  // 데모가 packages/*/src를 직접 import하므로 모노레포 루트까지 추적한다.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
}

const withMDX = createMDX()

export default withMDX(config)
