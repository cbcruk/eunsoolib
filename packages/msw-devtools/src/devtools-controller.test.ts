import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { DevtoolsController } from './devtools-controller'
import { DevtoolsStore } from './devtools-store'
import { createMemoryStorage } from './test-storage'

const server = setupServer(
  http.get('https://api.test/users', () =>
    HttpResponse.json([{ id: 1, name: 'original' }]),
  ),
  http.get(/\/regex\//, () => HttpResponse.text('regex')),
)

async function getUsers(): Promise<{ status: number; body: unknown }> {
  const response = await fetch('https://api.test/users')

  return { status: response.status, body: await response.json() }
}

function attach(seed = new Map<string, string>()) {
  const store = new DevtoolsStore(createMemoryStorage(seed))
  const controller = new DevtoolsController(server, store)

  return {
    store,
    controller,
    seed,
    dispose: () => {
      controller.dispose()
      store.dispose()
    },
  }
}

describe('DevtoolsController', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('등록된 핸들러에서 엔드포인트를 발견해야 함', () => {
    const { controller, dispose } = attach()

    expect(controller.getEndpoints().map((e) => e.id)).toEqual([
      'GET https://api.test/users',
    ])

    dispose()
  })

  it('오버라이드가 없으면 원래 핸들러를 건드리지 않아야 함', async () => {
    const { dispose } = attach()

    await expect(getUsers()).resolves.toEqual({
      status: 200,
      body: [{ id: 1, name: 'original' }],
    })

    dispose()
  })

  it('저장되지 않은 엔드포인트에는 꺼진 기본 오버라이드를 줘야 함', () => {
    const { controller, dispose } = attach()

    expect(controller.getOverride(controller.getEndpoints()[0])).toEqual({
      id: 'GET https://api.test/users',
      method: 'get',
      path: 'https://api.test/users',
      enabled: false,
      mode: 'json',
      status: 200,
      delay: 0,
      body: null,
    })

    dispose()
  })

  it('store에 오버라이드를 넣으면 즉시 응답이 바뀌어야 함', async () => {
    const { store, controller, dispose } = attach()

    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
      status: 500,
      body: { message: 'boom' },
    })

    await expect(getUsers()).resolves.toEqual({
      status: 500,
      body: { message: 'boom' },
    })
    expect(store.getActiveCount()).toBe(1)

    dispose()
  })

  it('clearActive는 원래 응답으로 되돌려야 함', async () => {
    const { store, controller, dispose } = attach()

    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
      status: 500,
    })
    store.clearActive()

    await expect(getUsers()).resolves.toMatchObject({ status: 200 })
    expect(store.getActiveCount()).toBe(0)

    dispose()
  })

  it('오버라이드를 꺼도 원래 응답으로 되돌려야 함', async () => {
    const { store, controller, dispose } = attach()

    const base = controller.getOverride(controller.getEndpoints()[0])
    store.upsertOverride({ ...base, enabled: true, status: 500 })
    store.upsertOverride({ ...base, enabled: false, status: 500 })

    await expect(getUsers()).resolves.toMatchObject({ status: 200 })

    dispose()
  })

  it('내보낸 시나리오를 다른 store로 가져오면 그대로 재생돼야 함', async () => {
    const source = attach()
    source.store.upsertOverride({
      ...source.controller.getOverride(source.controller.getEndpoints()[0]),
      enabled: true,
      status: 503,
      body: { message: 'maintenance' },
    })
    source.store.saveAsScenario('Checkout fails')
    const exported = source.store.exportScenario()
    source.dispose()

    const target = attach()
    target.store.importScenario(exported)

    await expect(getUsers()).resolves.toEqual({
      status: 503,
      body: { message: 'maintenance' },
    })
    expect(target.store.getActiveScenario().name).toBe('Checkout fails')

    target.dispose()
  })

  it('새로고침을 흉내내도 영속된 오버라이드가 다시 적용돼야 함', async () => {
    const seed = new Map<string, string>()

    const first = attach(seed)
    first.store.upsertOverride({
      ...first.controller.getOverride(first.controller.getEndpoints()[0]),
      enabled: true,
      status: 418,
    })
    first.dispose()

    await expect(getUsers()).resolves.toMatchObject({ status: 200 })

    const reloaded = attach(seed)

    await expect(getUsers()).resolves.toMatchObject({ status: 418 })
    expect(reloaded.store.getActiveCount()).toBe(1)

    reloaded.dispose()
  })

  it('dispose는 앱의 원래 핸들러를 되돌려야 함', async () => {
    const { store, controller, dispose } = attach()

    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
      status: 500,
    })
    dispose()

    await expect(getUsers()).resolves.toMatchObject({ status: 200 })
  })

  it('refresh는 엔드포인트를 다시 읽어야 함', () => {
    const { controller, dispose } = attach()

    server.use(
      http.post('https://api.test/orders', () => HttpResponse.json({})),
    )

    expect(controller.refresh().map((e) => e.id)).toContain(
      'POST https://api.test/orders',
    )

    dispose()
  })
})
