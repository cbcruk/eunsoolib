import { DRAFT_ID, DevtoolsStore } from './devtools-store'
import { createMemoryStorage } from './test-storage'
import type { Override } from './types'

function override(patch: Partial<Override> = {}): Override {
  return {
    id: 'GET /users',
    method: 'get',
    path: '/users',
    enabled: true,
    mode: 'json',
    status: 500,
    delay: 0,
    body: { message: 'boom' },
    ...patch,
  }
}

describe('DevtoolsStore 초기 상태', () => {
  it('빈 스토리지에서 Draft 시나리오 하나로 시작해야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    expect(store.getState()).toEqual({
      version: 1,
      scenarios: [{ id: DRAFT_ID, name: 'Draft', overrides: {} }],
      activeId: DRAFT_ID,
    })

    store.dispose()
  })

  it('깨진 JSON이 앱을 망가뜨리지 않고 빈 상태로 떨어져야 함', () => {
    const seed = new Map([['msw-devtools:v1', '{ not json']])
    const store = new DevtoolsStore(createMemoryStorage(seed))

    expect(store.getActiveScenario().id).toBe(DRAFT_ID)

    store.dispose()
  })

  it('version이 맞지 않으면 빈 상태로 떨어져야 함', () => {
    const seed = new Map([
      ['msw-devtools:v1', JSON.stringify({ version: 99, scenarios: [] })],
    ])
    const store = new DevtoolsStore(createMemoryStorage(seed))

    expect(store.getState().version).toBe(1)
    expect(store.getState().scenarios).toHaveLength(1)

    store.dispose()
  })

  it('Draft가 빠진 저장 상태에는 Draft를 다시 넣어야 함', () => {
    const seed = new Map([
      [
        'msw-devtools:v1',
        JSON.stringify({
          version: 1,
          scenarios: [{ id: 's_1', name: 'Saved', overrides: {} }],
          activeId: 's_1',
        }),
      ],
    ])
    const store = new DevtoolsStore(createMemoryStorage(seed))

    expect(store.getState().scenarios.map((s) => s.id)).toContain(DRAFT_ID)
    expect(store.getState().activeId).toBe('s_1')

    store.dispose()
  })

  it('activeId가 가리키는 시나리오가 없으면 Draft로 돌아가야 함', () => {
    const seed = new Map([
      [
        'msw-devtools:v1',
        JSON.stringify({
          version: 1,
          scenarios: [{ id: DRAFT_ID, name: 'Draft', overrides: {} }],
          activeId: 'gone',
        }),
      ],
    ])
    const store = new DevtoolsStore(createMemoryStorage(seed))

    expect(store.getState().activeId).toBe(DRAFT_ID)

    store.dispose()
  })

  it('스토리지가 없어도 메모리 전용으로 동작해야 함', () => {
    const store = new DevtoolsStore(undefined)

    store.upsertOverride(override())

    expect(store.getActiveCount()).toBe(1)

    store.dispose()
  })
})

describe('DevtoolsStore 오버라이드', () => {
  it('upsert한 오버라이드를 활성 시나리오에 넣어야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override())

    expect(store.getActiveScenario().overrides['GET /users']).toMatchObject({
      status: 500,
    })

    store.dispose()
  })

  it('같은 id를 다시 upsert하면 덮어써야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override({ status: 500 }))
    store.upsertOverride(override({ status: 404 }))

    expect(Object.keys(store.getActiveScenario().overrides)).toHaveLength(1)
    expect(store.getActiveScenario().overrides['GET /users'].status).toBe(404)

    store.dispose()
  })

  it('getActiveCount는 켜진 것만 세야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override({ id: 'GET /a', enabled: true }))
    store.upsertOverride(override({ id: 'GET /b', enabled: false }))

    expect(store.getActiveCount()).toBe(1)

    store.dispose()
  })

  it('removeOverride는 해당 항목만 지워야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override({ id: 'GET /a' }))
    store.upsertOverride(override({ id: 'GET /b' }))
    store.removeOverride('GET /a')

    expect(Object.keys(store.getActiveScenario().overrides)).toEqual(['GET /b'])

    store.dispose()
  })

  it('clearActive는 활성 시나리오를 비워야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override({ id: 'GET /a' }))
    store.upsertOverride(override({ id: 'GET /b' }))
    store.clearActive()

    expect(store.getActiveCount()).toBe(0)

    store.dispose()
  })
})

describe('DevtoolsStore 시나리오', () => {
  it('saveAsScenario는 현재 오버라이드를 복사해 활성화해야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override())
    const saved = store.saveAsScenario('Checkout fails')

    expect(store.getState().activeId).toBe(saved.id)
    expect(saved.name).toBe('Checkout fails')
    expect(saved.overrides['GET /users']).toMatchObject({ status: 500 })

    store.dispose()
  })

  it('저장된 시나리오는 Draft와 상태를 공유하지 않아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.upsertOverride(override())
    const saved = store.saveAsScenario('Checkout fails')

    store.setActiveScenario(DRAFT_ID)
    store.clearActive()

    expect(
      store.getState().scenarios.find((s) => s.id === saved.id)?.overrides,
    ).toHaveProperty('GET /users')

    store.dispose()
  })

  it('연속 저장에도 id가 겹치지 않아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    const ids = [
      store.saveAsScenario('a').id,
      store.saveAsScenario('b').id,
      store.saveAsScenario('c').id,
    ]

    expect(new Set(ids).size).toBe(3)

    store.dispose()
  })

  it('없는 시나리오로는 전환하지 않아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.setActiveScenario('gone')

    expect(store.getState().activeId).toBe(DRAFT_ID)

    store.dispose()
  })

  it('Draft는 지워지지 않아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    store.deleteScenario(DRAFT_ID)

    expect(store.getState().scenarios.map((s) => s.id)).toContain(DRAFT_ID)

    store.dispose()
  })

  it('활성 시나리오를 지우면 Draft로 돌아가야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    const saved = store.saveAsScenario('Checkout fails')
    store.deleteScenario(saved.id)

    expect(store.getState().activeId).toBe(DRAFT_ID)
    expect(store.getState().scenarios.map((s) => s.id)).not.toContain(saved.id)

    store.dispose()
  })
})

describe('DevtoolsStore export/import', () => {
  it('export한 JSON을 다시 import하면 오버라이드가 살아나야 함', () => {
    const source = new DevtoolsStore(createMemoryStorage())
    source.upsertOverride(override())
    const json = source.exportScenario()
    source.dispose()

    const target = new DevtoolsStore(createMemoryStorage())
    const imported = target.importScenario(json)

    expect(target.getState().activeId).toBe(imported.id)
    expect(target.getActiveCount()).toBe(1)

    target.dispose()
  })

  it('이름이 없는 시나리오는 Imported로 받아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    const imported = store.importScenario(JSON.stringify({ overrides: {} }))

    expect(imported.name).toBe('Imported')

    store.dispose()
  })

  it('overrides가 없는 JSON은 던져야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())

    expect(() => store.importScenario('{"name":"nope"}')).toThrow(
      /Not a scenario/,
    )

    store.dispose()
  })
})

describe('DevtoolsStore 영속과 구독', () => {
  it('같은 스토리지를 읽는 새 인스턴스가 상태를 이어받아야 함', () => {
    const seed = new Map<string, string>()

    const first = new DevtoolsStore(createMemoryStorage(seed))
    first.upsertOverride(override())
    first.dispose()

    const reloaded = new DevtoolsStore(createMemoryStorage(seed))

    expect(reloaded.getActiveCount()).toBe(1)

    reloaded.dispose()
  })

  it('변경마다 구독자를 불러야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())
    const listener = vi.fn()

    store.subscribe(listener)
    store.upsertOverride(override())
    store.clearActive()

    expect(listener).toHaveBeenCalledTimes(2)

    store.dispose()
  })

  it('구독 해제 후에는 부르지 않아야 함', () => {
    const store = new DevtoolsStore(createMemoryStorage())
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.upsertOverride(override())

    expect(listener).not.toHaveBeenCalled()

    store.dispose()
  })

  it('스토리지 쓰기가 실패해도 메모리 상태는 유지해야 함', () => {
    const storage = createMemoryStorage()
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const store = new DevtoolsStore(storage)

    expect(() => store.upsertOverride(override())).not.toThrow()
    expect(store.getActiveCount()).toBe(1)

    store.dispose()
  })
})
