#!/usr/bin/env node
import { createRequire } from 'node:module'
import { styleText } from 'node:util'
import { HELP, parseCliArgs } from './cli-args'
import { gitMvTs } from './git-mv-ts'

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2))

  if (args.help) {
    console.log(HELP)
    return
  }

  if (args.version) {
    const require = createRequire(import.meta.url)
    const { version } = require('../package.json') as { version: string }
    console.log(version)
    return
  }

  const { renamed, skipped } = await gitMvTs(args)

  for (const { from, to } of renamed) {
    console.log(`${from} → ${to}`)
  }

  for (const { file, reason } of skipped) {
    console.warn(styleText('yellow', `건너뜀 ${file}: ${reason}`))
  }

  const summary = args.dryRun
    ? `${renamed.length}개를 옮길 수 있습니다(드라이런).`
    : `${renamed.length}개를 옮겼습니다.`

  console.log(styleText('cyan', summary))

  if (skipped.length > 0) {
    console.log(styleText('yellow', `${skipped.length}개를 건너뛰었습니다.`))
  }
}

main().catch((error: unknown) => {
  console.error(
    styleText('red', error instanceof Error ? error.message : String(error)),
  )
  process.exitCode = 1
})
