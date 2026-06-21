import { useInsertionEffect, useMemo } from 'react'
import type { ReactElement } from 'react'
import { ATTR, buildCss, scopeFor, scopeId } from './scope-style'
import type {
  ScopeOptions,
  ScopeProps,
  ScopedStyleProps,
} from './scope-style.types'

/* ------------------------------------------------------------------ *
 * Client-side de-duplicated <style> registry (ref-counted)
 * ------------------------------------------------------------------ */

interface Entry {
  count: number
  node: HTMLStyleElement
}
const registry = new Map<string, Entry>()

function acquire(id: string, cssText: string): void {
  const existing = registry.get(id)
  if (existing) {
    existing.count++
    return
  }
  const node = document.createElement('style')
  node.dataset.scopeSheet = id
  node.textContent = cssText
  document.head.appendChild(node)
  registry.set(id, { count: 1, node })
}

function release(id: string): void {
  const entry = registry.get(id)
  if (!entry) return
  if (--entry.count === 0) {
    entry.node.remove()
    registry.delete(id)
  }
}

/**
 * Scope a CSS string to the element you spread the result onto. The `<style>` is
 * injected once into `<head>` and shared by every instance (ref-counted, removed
 * when the last user unmounts). Injection happens in an insertion effect, so it
 * does not run during SSR — use `ScopedStyle` if you need server-rendered styles.
 */
export function useScopedStyle(
  css: string,
  opts: ScopeOptions = {},
): ScopeProps {
  const { donut, layer, scopeNames } = opts
  const id = useMemo(
    () => scopeId(css, { donut, layer, scopeNames }),
    [css, donut, layer, scopeNames],
  )
  const cssText = useMemo(
    () => buildCss(id, css, { donut, layer, scopeNames }),
    [id, css, donut, layer, scopeNames],
  )

  useInsertionEffect(() => {
    acquire(id, cssText)
    return () => release(id)
  }, [id, cssText])

  return useMemo<ScopeProps>(() => ({ [ATTR]: id }), [id])
}

/**
 * SSR / React-19-native variant: renders a `<style>` element instead of doing
 * imperative head injection. Render it inside the scope root (or anywhere —
 * React 19 hoists it). Combine with `scopeFor` for the matching attribute.
 */
export function ScopedStyle({
  css,
  donut,
  layer,
  scopeNames,
  precedence = 'scoped',
}: ScopedStyleProps): ReactElement {
  const { id, css: cssText } = scopeFor(css, { donut, layer, scopeNames })
  // `href`/`precedence` are React 19 resource props; typed via the spread so the
  // component also compiles against React 18 type packages.
  const resourceProps = {
    href: `scope-${id}`,
    precedence,
  } as Record<string, string>
  return <style {...resourceProps}>{cssText}</style>
}
