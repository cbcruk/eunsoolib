/** Options controlling how a CSS string is wrapped in `@scope`. */
export interface ScopeOptions {
  /**
   * Lower boundary of the scope ("donut scope"). Controls how far styles reach
   * into nested subtrees.
   *
   * - `true`: stop at any nested element that owns a scope, i.e.
   *   `@scope (root) to ([data-scope])`. Child components styled with this
   *   library are excluded — true component isolation.
   * - `string`: use a custom lower-boundary selector, e.g. `".content"`.
   * - `false`: no boundary; styles descend into the entire subtree.
   *
   * @default true
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
   *
   * `@font-face`, `@property`, and `@counter-style` are intentionally **not**
   * namespaced — in development a warning is logged when they appear.
   *
   * @default true
   */
  scopeNames?: boolean
}

/** The object you spread onto the scope root element. */
export type ScopeProps = Readonly<Record<'data-scope', string>>

/** Props for the `ScopedStyle` component: the CSS to scope plus {@link ScopeOptions}. */
export interface ScopedStyleProps extends ScopeOptions {
  /** Authored CSS; selectors are relative to the scope root, and `:scope` targets the root. */
  css: string
  /**
   * `precedence` passed to the rendered `<style>`.
   *
   * React 19 hoists `<style>` to `<head>` and de-duplicates by `href` when a
   * `precedence` is given. Harmless on React 18 (renders inline).
   *
   * @default "scoped"
   */
  precedence?: string
}
