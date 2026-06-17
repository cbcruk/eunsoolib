/// <reference types="node" />
import { boxSizingAudit, formatReport } from './index'
import { parseArgs } from './cli'

/**
 * CLI entry: `node box-sizing-audit.example.js <url> [--scope sel] [--viewport WxH] [--json]`
 * Exits non-zero when likely regressions are found, so it drops straight into CI.
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.url) {
    console.error(
      'usage: box-sizing-audit <url> [--scope <selector>] [--viewport WxH] [--json]',
    )
    process.exit(2)
  }

  const result = await boxSizingAudit({
    url: args.url,
    scope: args.scope,
    viewport: args.viewport,
  })

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(
      formatReport(result, `${args.viewport.width}x${args.viewport.height}`),
    )
  }

  process.exit(result.regressions > 0 ? 1 : 0)
}

main()
