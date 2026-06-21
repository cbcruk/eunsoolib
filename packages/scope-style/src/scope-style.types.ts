export interface ScopeOptions {
  /**
   * Lower boundary of the scope ("donut scope"). Controls how far styles reach
   * into nested subtrees.
   *
   * - `true` (default): stop at any nested element that owns a scope, i.e.
   *   `@scope (root) to ([data-scope])`. Child components styled with this
   *   library are excluded — true component isolation.
   * - `string`: use a custom lower-boundary selector, e.g. `".content"`.
   * - `false`: no boundary; styles descend into the entire subtree.
   */
  donut?: boolean | string

  /**
   * Wrap the scoped rules in a cascade `@layer`, e.g. `"components"`. Lets you
   * control override order globally instead of fighting specificity.
   */
  layer?: string

  /**
   * Namespace name-defining at-rules that would otherwise leak globally.
   * Currently rewrites `@keyframes` (and `animation` / `animation-name`
   * references) so animations declared in one scope can't collide with another.
   * Default `true`.
   *
   * `@font-face`, `@property`, and `@counter-style` are intentionally **not**
   * namespaced — in development a warning is logged when they appear.
   */
  scopeNames?: boolean
}

/** The object you spread onto the scope root element. */
export type ScopeProps = Readonly<Record<'data-scope', string>>

export interface ScopedStyleProps extends ScopeOptions {
  css: string
  /**
   * React 19 hoists `<style>` to `<head>` and de-duplicates by `href` when a
   * `precedence` is given. Harmless on React 18 (renders inline). Default
   * `"scoped"`.
   */
  precedence?: string
}
