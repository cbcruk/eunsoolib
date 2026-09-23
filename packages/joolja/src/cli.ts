#!/usr/bin/env node
import { watch } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { styleText } from 'node:util'
import { CliArgs, HELP, parseCliArgs } from './cli-args'
import { joolja } from './joolja'
import { DEFAULT_EXTENSIONS } from './measure-images'

const WATCH_DEBOUNCE_MS = 50

async function run(args: CliArgs): Promise<void> {
  const { images, written } = await joolja(args)
  const count = Object.keys(images).length

  for (const file of written) {
    console.log(path.relative(process.cwd(), file))
  }

  console.log(styleText('cyan', `이미지 ${count}장을 측정했습니다.`))
}

/** 대상 디렉터리를 지켜보다가 이미지가 바뀌면 다시 실행한다. */
function watchImages(args: CliArgs, onChange: () => void): void {
  const dir = args.dir ?? process.cwd()
  const generated = new Set(['result.json', '_variables.scss', '_sprite.scss'])
  let timer: NodeJS.Timeout | undefined

  watch(dir, (_event, file) => {
    if (!file) return

    const extension = path.extname(file).toLowerCase()
    const extensions = args.extensions ?? DEFAULT_EXTENSIONS

    // 자기가 쓴 파일을 감지해 무한히 다시 실행하지 않도록 거른다.
    if (!extensions.includes(extension) || generated.has(file)) return

    clearTimeout(timer)
    timer = setTimeout(onChange, WATCH_DEBOUNCE_MS)
  })
}

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

  await run(args)

  if (args.watch) {
    watchImages(args, () => {
      run(args).catch(fail)
    })
  }
}

function fail(error: unknown): void {
  console.error(
    styleText('red', error instanceof Error ? error.message : String(error)),
  )
  process.exitCode = 1
}

main().catch(fail)
