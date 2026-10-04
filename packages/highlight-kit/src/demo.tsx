import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { isHighlightSupported } from './core'
import type { TokenRule } from './tokenize'
import {
  Highlight,
  HighlightProvider,
  HighlightStyles,
  useHighlightController,
  useHighlightSearch,
  useHighlightSnapshots,
  useValueHighlightSearch,
  useValueTokens,
  type HighlightStyleMap,
} from './react'

const DEMO_STYLES: HighlightStyleMap = {
  search: { backgroundColor: 'rgb(253 224 71)', color: 'rgb(113 63 18)' },
  'search-current': { backgroundColor: 'rgb(249 115 22)', color: 'white' },
  'log-error': {
    backgroundColor: 'rgb(254 202 202)',
    color: 'rgb(127 29 29)',
    textDecoration: 'underline wavy rgb(220 38 38)',
  },
  'log-warn': { backgroundColor: 'rgb(254 243 199)', color: 'rgb(120 53 15)' },
  'log-info': { backgroundColor: 'rgb(219 234 254)', color: 'rgb(30 64 175)' },
  'kw-keyword': { color: 'rgb(192 132 252)' },
  'kw-number': { color: 'rgb(251 146 60)' },
  'kw-comment': { color: 'rgb(148 163 184)' },
  'val-keyword': { color: 'rgb(192 132 252)' },
  'val-string': { color: 'rgb(134 239 172)' },
  'val-number': { color: 'rgb(251 146 60)' },
  'val-comment': { color: 'rgb(148 163 184)' },
  'note-match': {
    backgroundColor: 'rgb(254 240 138)',
    color: 'rgb(113 63 18)',
  },
  'note-current': {
    backgroundColor: 'rgb(249 115 22)',
    color: 'white',
  },
}

const SAMPLE_PROSE = `The only true wisdom is in knowing you know nothing.
Wisdom begins in wonder. The journey of a thousand miles begins with a single step.
In the middle of difficulty lies opportunity. Knowledge speaks, but wisdom listens.
Turn your wounds into wisdom. The invariable mark of wisdom is to see the miraculous in the common.
Wisdom is not a product of schooling but of the lifelong attempt to acquire it.
Patience is the companion of wisdom. The art of being wise is knowing what to overlook.`

const SAMPLE_LOGS = `INFO: Server started successfully on port 3000.
WARN: Memory usage exceeded 80% threshold.
ERROR: Connection timeout after 30 seconds.
INFO: User authentication completed for user_id=4821.
ERROR: Database query failed - invalid syntax near 'WHRE'.
WARN: Deprecated API endpoint /v1/users will be removed.
INFO: Cache refreshed with 1500 entries.`

const SAMPLE_CODE = `// quicksort in-place
function quicksort(arr, lo = 0, hi = arr.length - 1) {
  if (lo < hi) {
    const p = partition(arr, lo, hi);
    return quicksort(arr, lo, p - 1);
  }
}`

const EDITABLE_CODE = `// drag the caret and keep typing
function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  return i; // comments stay grey, even with keywords: const return
}`

const SAMPLE_NOTE = `Wisdom begins in wonder, and wonder begins in attention.
Attention is the rarest form of generosity.
Keep your attention on what is in front of you.
Attention, taken far enough, becomes devotion.`

/**
 * Rules for the editable code demo. Order is precedence: comment and string
 * rules come first so a keyword inside either is left alone.
 */
const CODE_RULES: TokenRule[] = [
  { name: 'val-comment', pattern: /\/\/[^\n]*/ },
  { name: 'val-string', pattern: /'[^']*'|"[^"]*"/ },
  { name: 'val-keyword', pattern: /\b(?:function|const|let|return)\b/ },
  { name: 'val-number', pattern: /\b\d+\b/ },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function SupportBanner(): ReactNode {
  const [ok, setOk] = useState(true)
  useEffect(() => setOk(isHighlightSupported()), [])
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />
      {ok ? 'CSS Custom Highlight API supported' : 'Not supported'}
    </div>
  )
}

function SearchDemo(): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('wisdom')
  const { count, active, next, prev } = useHighlightSearch(ref, query)

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) prev()
      else next()
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          1. Search + navigation
        </h3>
        <code className="text-xs text-slate-500">useHighlightSearch()</code>
      </div>
      <div className="mb-3 flex items-center gap-1">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="search… (Enter / Shift+Enter)"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
        />
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-500">
          {count === 0 ? '0/0' : `${active + 1}/${count}`}
        </span>
        <button
          onClick={prev}
          disabled={count === 0}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ↑
        </button>
        <button
          onClick={next}
          disabled={count === 0}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ↓
        </button>
      </div>
      <div
        ref={ref}
        className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-serif text-[15px] leading-relaxed text-slate-800"
      >
        {SAMPLE_PROSE}
      </div>
    </section>
  )
}

function LogLevelDemo(): ReactNode {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          2. Multiple names
        </h3>
        <code className="text-xs text-slate-500">
          &lt;Highlight.Match /&gt;
        </code>
      </div>
      <Highlight.Root
        name="log-info"
        className="whitespace-pre-wrap rounded-lg bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100"
      >
        {SAMPLE_LOGS}
        <Highlight.Match name="log-error" pattern={/ERROR:[^\n]*/} />
        <Highlight.Match name="log-warn" pattern={/WARN:[^\n]*/} />
        <Highlight.Match name="log-info" pattern={/INFO:[^\n]*/} />
      </Highlight.Root>
    </section>
  )
}

function CodeDemo(): ReactNode {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          3. RegExp patterns
        </h3>
        <code className="text-xs text-slate-500">no DOM rewrite</code>
      </div>
      <Highlight.Root
        name="kw-keyword"
        as="pre"
        className="overflow-x-auto whitespace-pre rounded-lg bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100"
      >
        {SAMPLE_CODE}
        <Highlight.Match
          name="kw-keyword"
          pattern={/\b(function|const|return|if)\b/}
        />
        <Highlight.Match name="kw-number" pattern={/\b\d+\b/} />
        <Highlight.Match name="kw-comment" pattern={/\/\/[^\n]*/} />
      </Highlight.Root>
    </section>
  )
}

/**
 * `<pre>` 대신 편집 가능한 `<textarea>`를 토큰화한다. DOM Range로는 불가능한
 * 영역이라 `OpaqueRange`가 필요하다.
 */
function ValueTokenDemo(): ReactNode {
  const { ref, supported, counts } = useValueTokens<HTMLTextAreaElement>(
    CODE_RULES,
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          4. Editable textarea (OpaqueRange)
        </h3>
        <code className="text-xs text-slate-500">createValueRange</code>
      </div>
      {!supported && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          이 브라우저는 <code>OpaqueRange</code>를 지원하지 않습니다 (Chromium
          152+ 필요). textarea는 평소대로 동작하고 하이라이트만 빠집니다.
        </p>
      )}
      <textarea
        ref={ref}
        defaultValue={EDITABLE_CODE}
        spellCheck={false}
        rows={6}
        className="w-full resize-y rounded-lg bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100 caret-white outline-none focus:ring-2 focus:ring-violet-400"
      />
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {CODE_RULES.map((rule) => (
          <div key={rule.name} className="flex gap-1">
            <dt>
              <code>{rule.name}</code>
            </dt>
            <dd className="font-medium text-slate-700">
              {counts[rule.name] ?? 0}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        규칙 순서가 우선순위다. 주석 안에 <code>const</code>를 써도 keyword 규칙이
        이기지 못하고 주석 색으로 남는다.
      </p>
    </section>
  )
}

/** textarea 안에서 next/prev 네비게이션. 캐럿과 선택 영역은 건드리지 않는다. */
function ValueSearchDemo(): ReactNode {
  const [query, setQuery] = useState('attention')
  const { ref, count, active, next, prev, supported } =
    useValueHighlightSearch<HTMLTextAreaElement>(query, {
      name: 'note',
    })

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (event.shiftKey) prev()
    else next()
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          5. Search inside a textarea
        </h3>
        <code className="text-xs text-slate-500">scrollTop, not selection</code>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="검색어 (Enter / Shift+Enter)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />
        <span className="w-14 text-center text-xs tabular-nums text-slate-500">
          {count === 0 ? '0/0' : `${active + 1}/${count}`}
        </span>
        <button
          type="button"
          onClick={prev}
          disabled={count === 0}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={next}
          disabled={count === 0}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
        >
          ↓
        </button>
      </div>
      {!supported && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <code>OpaqueRange</code> 미지원 — 입력은 되지만 하이라이트는 없습니다.
        </p>
      )}
      <textarea
        ref={ref}
        defaultValue={SAMPLE_NOTE}
        rows={4}
        className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
      />
    </section>
  )
}

/**
 * getRanges(name)로 개별 Range 위치를 가져와 viewport에 overlay div로 그린다.
 * `::highlight()`가 box model을 지원하지 않아 둥근 테두리를 직접 그려야 하는 경우의 예시.
 */
function RangeOverlay({ name }: { name: string | null }): ReactNode {
  const controller = useHighlightController()
  const snapshot = useHighlightSnapshots()
  const [rects, setRects] = useState<Rect[]>([])

  useEffect(() => {
    if (!name) {
      setRects([])
      return
    }
    const recompute = (): void => {
      const out: Rect[] = []
      for (const r of controller.getRanges(name)) {
        for (const rect of r.getClientRects()) {
          out.push({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          })
        }
      }
      setRects(out)
    }
    recompute()
    window.addEventListener('scroll', recompute, true)
    window.addEventListener('resize', recompute)
    return () => {
      window.removeEventListener('scroll', recompute, true)
      window.removeEventListener('resize', recompute)
    }
  }, [name, controller, snapshot])

  if (!name) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {rects.map((r, i) => (
        <div
          key={i}
          className="fixed rounded-[2px]"
          style={{
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            outline: '2px solid rgb(244 63 94)',
            boxShadow: '0 0 0 4px rgba(244,63,94,0.18)',
          }}
        />
      ))}
    </div>
  )
}

function StoreInspector(): ReactNode {
  const snapshot = useHighlightSnapshots()
  const [selected, setSelected] = useState<string | null>(null)
  const entries = Object.entries(snapshot).sort(([a], [b]) =>
    a.localeCompare(b),
  )

  useEffect(() => {
    if (selected && !(selected in snapshot)) setSelected(null)
  }, [snapshot, selected])

  return (
    <section className="rounded-xl border border-slate-300 bg-slate-900 p-5 text-slate-100 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <h3 className="text-sm font-semibold">store inspector</h3>
        <span className="text-[11px] text-slate-400">
          (useHighlightSnapshots · getRanges)
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">no active highlights</p>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {entries.map(([name, { count }]) => {
            const isSel = selected === name
            return (
              <li key={name}>
                <button
                  onClick={() => setSelected(isSel ? null : name)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors ${
                    isSel
                      ? 'bg-rose-500/20 ring-1 ring-rose-400'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <span className="text-slate-300">::highlight({name})</span>
                  <span className="tabular-nums text-emerald-300">
                    {count} ranges
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        행을 클릭하면 <code>controller.getRanges(name)</code> →{' '}
        <code>Range.getClientRects()</code> 로 해당 Range들의 실제 위치를 화면에
        오버레이합니다.
      </p>
      <RangeOverlay name={selected} />
    </section>
  )
}

export function HighlightDemo(): ReactNode {
  return (
    <HighlightProvider>
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <HighlightStyles styles={DEMO_STYLES} />
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              highlight-kit · controller + provider + range overlay
            </h1>
            <p className="text-sm text-slate-600">
              sink 분리로 bookkeeping/CSS write 격리 · <code>getRanges</code> 로
              위치 시각화 · Provider 주입.
            </p>
            <SupportBanner />
          </header>
          <SearchDemo />
          <LogLevelDemo />
          <CodeDemo />
          <ValueTokenDemo />
          <ValueSearchDemo />
          <StoreInspector />
        </div>
      </div>
    </HighlightProvider>
  )
}
