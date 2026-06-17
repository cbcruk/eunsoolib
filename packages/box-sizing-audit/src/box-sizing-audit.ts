import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { analyzeAudit } from './analyze'
import { buildFlipCss } from './cli'
import type {
  AuditOptions,
  AuditResult,
  ElementSnapshot,
} from './box-sizing-audit.types'

/** Runs IN the page: tag every element once, return page-coordinate geometry. */
function snapshot(): ElementSnapshot[] {
  const out: ElementSnapshot[] = []
  document.querySelectorAll('*').forEach((el, i) => {
    if (!el.hasAttribute('data-bsi')) el.setAttribute('data-bsi', String(i))
    const r = el.getBoundingClientRect()
    out.push({
      id: el.getAttribute('data-bsi') ?? String(i),
      tag: el.tagName.toLowerCase(),
      cls: el.getAttribute('class') ?? '',
      x: r.x + scrollX,
      y: r.y + scrollY,
      w: r.width,
      h: r.height,
      sw: el.scrollWidth,
      cw: el.clientWidth,
      sh: el.scrollHeight,
      ch: el.clientHeight,
    })
  })
  return out
}

const DEFAULT_VIEWPORT = { width: 1280, height: 800 }

/**
 * Toggle-and-compare auditor for a content-box → border-box migration.
 *
 * Captures the page as-is, injects `box-sizing: border-box` on the chosen scope,
 * recaptures, and diffs the delta. The baseline is the page's real current state,
 * so anything already border-box is a no-op and never shows up.
 *
 * Requires `playwright`, `pixelmatch`, and `pngjs` to be installed (peer deps).
 */
export async function boxSizingAudit(
  options: AuditOptions,
): Promise<AuditResult> {
  const { url, scope = null, viewport = DEFAULT_VIEWPORT, thresholds } = options
  const flipCss = buildFlipCss(scope)

  const browser = await chromium.launch()
  try {
    // deviceScaleFactor:1 keeps PNG px == CSS px so crop math is 1:1.
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null))

    const before = await page.evaluate(snapshot)
    const beforePng = PNG.sync.read(await page.screenshot({ fullPage: true }))

    await page.addStyleTag({ content: flipCss })
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )

    const after = await page.evaluate(snapshot)
    const afterPng = PNG.sync.read(await page.screenshot({ fullPage: true }))

    return analyzeAudit({
      url,
      scope,
      before,
      after,
      beforeImg: {
        width: beforePng.width,
        height: beforePng.height,
        data: beforePng.data,
      },
      afterImg: {
        width: afterPng.width,
        height: afterPng.height,
        data: afterPng.data,
      },
      compare: (a, b, w, h) =>
        pixelmatch(a, b, undefined, w, h, { threshold: 0.1 }),
      thresholds,
    })
  } finally {
    await browser.close()
  }
}
