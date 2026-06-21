# @eunsoolib/scope-style

Scope **real CSS** to a component subtree using native CSS `@scope` + `@layer`.
No build step, no class-name juggling, no runtime CSS parser. You write ordinary
CSS; the library wraps it so it can only reach your component's own DOM.

## Install

```bash
pnpm add @eunsoolib/scope-style react
```

```tsx
import { useScopedStyle } from '@eunsoolib/scope-style'

function Card({ children }: { children?: React.ReactNode }) {
  const scope = useScopedStyle(
    `
    :scope  { display: grid; gap: 8px; padding: 16px; border: 1px solid #ddd; }
    .title  { font-weight: 700; }
    p       { color: crimson; }
    `,
    { layer: 'components' },
  )

  return (
    <article {...scope}>
      <h2 className="title">Title</h2>
      <p>This paragraph is red.</p>
      {children}
    </article>
  )
}
```

## Why not just prefix selectors with an id?

The common pattern (e.g. React's own `<style>` docs) is `useId()` + `#id .foo`.
That uses a descendant combinator, so `#id .foo` also matches `.foo` inside
**nested child components** — the styles leak downward.

`scope-style` uses `@scope (root) to ([data-scope])`. The `to (...)` lower
boundary creates a **donut**: styling applies to your subtree but stops at any
nested element that owns its own scope. Children styled with this library keep
their own look untouched. That boundary is the part you cannot express cleanly
with selector prefixing — and the reason reaching into React internals (fiber)
is the wrong tool: the boundary lives in the CSS cascade, not the reconciler.

## API

### `useScopedStyle(css, options?) => { "data-scope": string }`

Client hook. Injects one shared, ref-counted `<style>` into `<head>` (added on
mount, removed when the last instance unmounts) and returns props to spread onto
the scope root. The id is a stable hash of the CSS, so every instance of a
component shares a single `<style>` node.

### `options`

| option  | type                | default | meaning                                                                                        |
| ------- | ------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `donut` | `boolean \| string` | `true`  | `true` → stop at any nested scope. `string` → custom boundary selector. `false` → no boundary. |
| `layer` | `string`            | —       | Wrap rules in `@layer <name>` for predictable override order.                                  |

### `ScopedStyle` + `scopeFor` (SSR / React 19)

The hook injects in an insertion effect, which does not run during SSR. For
server rendering, render a real `<style>` element instead and pair it with the
deterministic `scopeFor` helper:

```tsx
import { ScopedStyle, scopeFor } from '@eunsoolib/scope-style'

const css = `:scope { padding: 16px } p { color: crimson }`

function Card() {
  const { props } = scopeFor(css, { layer: 'components' })
  return (
    <article {...props}>
      <ScopedStyle css={css} layer="components" />
      <p>Scoped, and server-rendered.</p>
    </article>
  )
}
```

On React 19, `<ScopedStyle>` emits `<style href precedence>`, which React hoists
to `<head>` and de-duplicates automatically (works during streaming SSR too). On
React 18 it renders inline, which still works because the scope is selector-based
rather than position-based.

## Authoring notes

- Selectors are relative to the scope root. Use `:scope` for the root element.
- Native nesting, `&`, `@media`, `:hover`, custom properties — all pass through.
- `@keyframes` / `@font-face` declared inside `@scope` are valid but **global**
  (per spec). Name them uniquely.

## Browser support

Requires native CSS `@scope` — Baseline Newly Available (Chrome/Safari since
2024, Firefox 146, Dec 2025). For older targets, gate with
`@supports at-rule(@scope) { ... }` or fall back to a build-time solution.

## License

MIT
