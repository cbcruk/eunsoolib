import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // 모노레포 루트에서 의존성을 끌어오므로 추적 범위를 루트로 넓힌다.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
}

export default config
