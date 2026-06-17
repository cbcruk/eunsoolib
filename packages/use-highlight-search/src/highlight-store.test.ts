import { describe, expect, it, vi } from 'vitest'
import { createHighlightStore, createNoopSink } from './highlight-store'
import type { HighlightSink } from './types'

function range(): Range {
  return document.createRange()
}

describe('createHighlightStore', () => {
  it('setRanges가 name별 Range 개수를 snapshot에 반영해야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    store.setRanges('search', Symbol('a'), [range(), range()])

    expect(store.getSnapshot().search).toBe(2)
  })

  it('같은 name에 여러 sourceId가 등록되면 Range가 합성되어야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    store.setRanges('search', Symbol('a'), [range()])
    store.setRanges('search', Symbol('b'), [range(), range()])

    expect(store.getSnapshot().search).toBe(3)
    expect(store.getRanges('search')).toHaveLength(3)
  })

  it('마지막 sourceId가 제거되면 name 항목 자체가 사라져야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    const a = Symbol('a')
    const b = Symbol('b')
    store.setRanges('search', a, [range()])
    store.setRanges('search', b, [range()])

    store.remove('search', a)
    expect(store.getSnapshot().search).toBe(1)

    store.remove('search', b)
    expect('search' in store.getSnapshot()).toBe(false)
    expect(store.getRanges('search')).toEqual([])
  })

  it('getSnapshot은 변경이 없으면 안정 참조를 유지해야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    const first = store.getSnapshot()
    expect(store.getSnapshot()).toBe(first)

    store.setRanges('search', Symbol('a'), [range()])
    const second = store.getSnapshot()
    expect(second).not.toBe(first)
    expect(store.getSnapshot()).toBe(second)
  })

  it('변경 시 구독자에게 알리고, unsubscribe 후에는 알리지 않아야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setRanges('search', Symbol('a'), [range()])
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.setRanges('search', Symbol('b'), [range()])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('sink에 commit/remove 부수효과를 위임해야 함', () => {
    const sink: HighlightSink = { commit: vi.fn(), remove: vi.fn() }
    const store = createHighlightStore({ sink })
    const id = Symbol('a')

    store.setRanges('search', id, [range()], 1)
    expect(sink.commit).toHaveBeenCalledWith('search', expect.any(Array), 1)

    store.remove('search', id)
    expect(sink.remove).toHaveBeenCalledWith('search')
  })

  it('getServerSnapshot은 빈 객체를 반환해야 함', () => {
    const store = createHighlightStore({ sink: createNoopSink() })
    expect(store.getServerSnapshot()).toEqual({})
  })
})
