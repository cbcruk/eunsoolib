import { isSupported } from './support'
import type {
  CreateHighlightStoreOptions,
  HighlightSink,
  HighlightSnapshot,
  HighlightStore,
  SourceId,
} from './types'

const EMPTY: HighlightSnapshot = Object.freeze({})

interface HighlightEntry {
  priority: number
  sources: Map<SourceId, Range[]>
}

/**
 * TS 5.9의 lib.dom은 `Highlight`/`HighlightRegistry`의 set/map 메서드를 선언하지
 * 않으므로, sink가 실제로 사용하는 부분만 로컬 타입으로 좁혀 캐스팅한다.
 */
interface CssHighlight {
  priority: number
  add(range: Range): void
  clear(): void
}

interface CssHighlightRegistry {
  get(name: string): CssHighlight | undefined
  set(name: string, highlight: CssHighlight): void
  delete(name: string): void
}

type HighlightConstructor = new (...ranges: Range[]) => CssHighlight

/**
 * 실제 `CSS.highlights`에 반영하는 브라우저 sink.
 */
export function createCssHighlightSink(): HighlightSink {
  return {
    commit(name, ranges, priority): void {
      if (!isSupported()) return
      const registry = CSS.highlights as unknown as CssHighlightRegistry
      let h = registry.get(name)
      if (!h) {
        const Ctor = window.Highlight as unknown as HighlightConstructor
        h = new Ctor()
        registry.set(name, h)
      }
      h.priority = priority
      h.clear()
      for (const r of ranges) h.add(r)
    },
    remove(name): void {
      if (!isSupported()) return
      const registry = CSS.highlights as unknown as CssHighlightRegistry
      registry.delete(name)
    },
  }
}

/**
 * 테스트/SSR 용 sink. 부수효과 없이 store bookkeeping만 검증할 수 있게 한다.
 */
export function createNoopSink(): HighlightSink {
  return { commit(): void {}, remove(): void {} }
}

/**
 * 프레임워크 무관 코어 팩토리. bookkeeping은 항상 동작하고, CSS write는 sink로 격리된다.
 * 같은 이름은 `sourceId`별 Range[]를 ref-counting으로 합성/정리한다.
 */
export function createHighlightStore({
  sink = createCssHighlightSink(),
}: CreateHighlightStoreOptions = {}): HighlightStore {
  const entries = new Map<string, HighlightEntry>()
  const listeners = new Set<() => void>()
  let snapshot: HighlightSnapshot = EMPTY

  const merged = (e: HighlightEntry): Range[] => {
    const out: Range[] = []
    for (const ranges of e.sources.values()) out.push(...ranges)
    return out
  }

  const rebuildSnapshot = (): void => {
    const next: Record<string, number> = {}
    for (const [name, e] of entries) {
      let n = 0
      for (const ranges of e.sources.values()) n += ranges.length
      next[name] = n
    }
    snapshot = next
  }

  const emit = (): void => {
    rebuildSnapshot()
    listeners.forEach((l) => l())
  }

  return {
    setRanges(name, sourceId, ranges, priority = 0): void {
      let e = entries.get(name)
      if (!e) {
        e = { priority, sources: new Map() }
        entries.set(name, e)
      } else {
        e.priority = priority
      }
      e.sources.set(sourceId, ranges)
      sink.commit(name, merged(e), e.priority)
      emit()
    },
    remove(name, sourceId): void {
      const e = entries.get(name)
      if (!e) return
      e.sources.delete(sourceId)
      if (e.sources.size === 0) {
        sink.remove(name)
        entries.delete(name)
      } else {
        sink.commit(name, merged(e), e.priority)
      }
      emit()
    },
    subscribe(l): () => void {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    getSnapshot: (): HighlightSnapshot => snapshot,
    getServerSnapshot: (): HighlightSnapshot => EMPTY,
    getRanges(name): Range[] {
      const e = entries.get(name)
      return e ? merged(e) : []
    },
  }
}

/** Provider 없이도 동작하는 모듈 싱글턴. */
export const defaultStore: HighlightStore = createHighlightStore()
