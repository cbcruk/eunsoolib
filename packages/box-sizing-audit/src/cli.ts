import type { CliArgs } from './box-sizing-audit.types'

/**
 * Build the toggle stylesheet. A scope flips only that subtree (opt-in migration
 * simulation); no scope flips the whole page.
 */
export function buildFlipCss(scope: string | null): string {
  return scope
    ? `${scope}, ${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: border-box !important }`
    : `*, *::before, *::after { box-sizing: border-box !important }`
}

/** Parse `<url> [--scope sel] [--viewport WxH] [--json]` into structured args. */
export function parseArgs(argv: string[]): CliArgs {
  const url = argv.find((a) => /^https?:\/\//.test(a)) ?? null
  const json = argv.includes('--json')

  const flag = (name: string): string | null => {
    const i = argv.indexOf(`--${name}`)
    const value = argv[i + 1]
    return i >= 0 && value && !value.startsWith('--') ? value : null
  }

  const scope = flag('scope')
  const [vw, vh] = (flag('viewport') ?? '1280x800').split('x').map(Number)

  return {
    url,
    scope,
    viewport: {
      width: Number.isFinite(vw) ? vw : 1280,
      height: Number.isFinite(vh) ? vh : 800,
    },
    json,
  }
}
