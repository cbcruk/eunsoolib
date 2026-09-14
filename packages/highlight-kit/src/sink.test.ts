import { describe, expect, it, vi } from 'vitest'
import {
  createHighlightController,
  createNoopSink,
  type HighlightSink,
} from './core'

function range(): Range {
  return document.createRange()
}

describe('createHighlightController (sink 주입)', () => {
  it('noop sink면 미지원 환경에서도 name별 Range 개수를 snapshot에 반영해야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    controller.set('search', Symbol('a'), [range(), range()])

    expect(controller.getSnapshot('search')).toEqual({ active: true, count: 2 })
  })

  it('같은 name에 여러 sourceId가 등록되면 Range가 합성되어야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    controller.set('search', Symbol('a'), [range()])
    controller.set('search', Symbol('b'), [range(), range()])

    expect(controller.getSnapshot('search').count).toBe(3)
    expect(controller.getRanges('search')).toHaveLength(3)
  })

  it('마지막 sourceId가 제거되면 name 항목 자체가 사라져야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const a = Symbol('a')
    const b = Symbol('b')
    controller.set('search', a, [range()])
    controller.set('search', b, [range()])

    controller.remove('search', a)
    expect(controller.getSnapshot('search').count).toBe(1)

    controller.remove('search', b)
    expect('search' in controller.getSnapshots()).toBe(false)
    expect(controller.getRanges('search')).toEqual([])
  })

  it('getSnapshots는 변경이 없으면 안정 참조를 유지해야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const first = controller.getSnapshots()
    expect(controller.getSnapshots()).toBe(first)

    controller.set('search', Symbol('a'), [range()])
    const second = controller.getSnapshots()
    expect(second).not.toBe(first)
    expect(second.search).toEqual({ active: true, count: 1 })
    expect(controller.getSnapshots()).toBe(second)
  })

  it('변경 시 구독자에게 알리고, unsubscribe 후에는 알리지 않아야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)

    controller.set('search', Symbol('a'), [range()])
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    controller.set('search', Symbol('b'), [range()])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('sink에 commit/remove 부수효과를 priority와 함께 위임해야 함', () => {
    const sink: HighlightSink = { commit: vi.fn(), remove: vi.fn() }
    const controller = createHighlightController({ sink })
    const id = Symbol('a')

    controller.set('search', id, [range()], 1)
    expect(sink.commit).toHaveBeenCalledWith('search', expect.any(Array), 1)

    controller.remove('search', id)
    expect(sink.remove).toHaveBeenCalledWith('search')
  })

  it('sink.isSupported가 false면 bookkeeping도 하지 않아야 함', () => {
    const sink: HighlightSink = {
      commit: vi.fn(),
      remove: vi.fn(),
      isSupported: () => false,
    }
    const controller = createHighlightController({ sink })
    controller.set('search', 'a', [range()])

    expect(controller.supported).toBe(false)
    expect(controller.getSnapshot('search').active).toBe(false)
    expect(sink.commit).not.toHaveBeenCalled()
  })

  it('getServerSnapshots는 빈 객체를 반환해야 함', () => {
    const controller = createHighlightController({ sink: createNoopSink() })
    controller.set('search', 'a', [range()])

    expect(controller.getServerSnapshots()).toEqual({})
  })
})
