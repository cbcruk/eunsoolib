import { useState, type ReactNode } from 'react'
import { useScopedStyle } from './use-scoped-style'

/** Inner component: owns its own scope, paints its `<p>` blue. */
function InnerCard({ donut }: { donut: boolean }): ReactNode {
  const scope = useScopedStyle(
    `:scope { display:block; padding:12px; border:1px dashed #6b7cff; border-radius:8px; background:#f5f6ff; }
     p { color:#3b4cca; font-weight:600; margin:0; }`,
    { donut, layer: 'components' },
  )
  return (
    <div {...scope}>
      <p>Inner card &lt;p&gt; — owns scope, should stay BLUE.</p>
    </div>
  )
}

/** Outer component: paints every descendant `<p>` red. */
function OuterCard({ donut }: { donut: boolean }): ReactNode {
  const scope = useScopedStyle(
    `:scope { display:grid; gap:12px; padding:16px; border:1px solid #ddd; border-radius:12px; }
     p { color:#d6336c; font-weight:600; margin:0; }`,
    { donut, layer: 'components' },
  )
  return (
    <div {...scope}>
      <p>Outer card &lt;p&gt; (unscoped child) — RED.</p>
      <InnerCard donut={donut} />
    </div>
  )
}

export function ScopeStyleDemo(): ReactNode {
  const [donut, setDonut] = useState(true)
  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui',
        maxWidth: 460,
        margin: '24px auto',
        padding: 16,
      }}
    >
      <h3 style={{ margin: '0 0 4px' }}>donut scope demo</h3>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14 }}>
        Outer styles <code>p</code> red. Inner card owns its own scope and
        styles its <code>p</code> blue. With donut <b>on</b>, the outer&apos;s
        red stops at the inner boundary; with it <b>off</b>, red leaks in and
        wins by source order.
      </p>

      <label
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
          fontSize: 14,
        }}
      >
        <input
          type="checkbox"
          checked={donut}
          onChange={(e) => setDonut(e.target.checked)}
        />
        <span>
          donut boundary{' '}
          <code
            style={{
              background: '#f0f0f0',
              padding: '1px 5px',
              borderRadius: 4,
            }}
          >
            {donut ? 'to ([data-scope])' : '(none)'}
          </code>
        </span>
      </label>

      <OuterCard key={String(donut)} donut={donut} />

      <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
        Inner stays blue ⇒ isolation holds. Toggle off and the inner{' '}
        <code>p</code> turns red ⇒ the boundary was doing the work.
      </p>
    </div>
  )
}
