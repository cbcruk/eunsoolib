import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  HighlightStoreProvider,
  useHighlightSnapshot,
  useStore,
} from './highlight-context'
import { useHighlightSearch } from './use-highlight-search'
import { Highlight } from './highlight'
import { HighlightStyles } from './highlight-styles'
import { isSupported } from './support'

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

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function SupportBanner(): ReactNode {
  const [ok, setOk] = useState(true)
  useEffect(() => setOk(isSupported()), [])
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
 * getRanges(name)로 개별 Range 위치를 가져와 viewport에 overlay div로 그린다.
 * `::highlight()`가 box model을 지원하지 않아 둥근 테두리를 직접 그려야 하는 경우의 예시.
 */
function RangeOverlay({ name }: { name: string | null }): ReactNode {
  const store = useStore()
  const snapshot = useHighlightSnapshot()
  const [rects, setRects] = useState<Rect[]>([])

  useEffect(() => {
    if (!name) {
      setRects([])
      return
    }
    const recompute = (): void => {
      const out: Rect[] = []
      for (const r of store.getRanges(name)) {
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
  }, [name, store, snapshot])

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
  const snapshot = useHighlightSnapshot()
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
          (useSyncExternalStore · getRanges)
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">no active highlights</p>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {entries.map(([name, n]) => {
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
                    {n} ranges
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        행을 클릭하면 <code>store.getRanges(name)</code> →{' '}
        <code>Range.getClientRects()</code> 로 해당 Range들의 실제 위치를 화면에
        오버레이합니다.
      </p>
      <RangeOverlay name={selected} />
    </section>
  )
}

export function HighlightDemo(): ReactNode {
  return (
    <HighlightStoreProvider>
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <HighlightStyles />
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Highlight store · factory + provider + range overlay
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
          <StoreInspector />
        </div>
      </div>
    </HighlightStoreProvider>
  )
}
