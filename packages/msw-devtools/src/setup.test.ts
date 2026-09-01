import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { PANEL_TAG_NAME } from './panel'
import { setupMswDevtools } from './setup'
import { createMemoryStorage } from './test-storage'

const server = setupServer(
  http.get('https://api.test/users', () => HttpResponse.json(['original'])),
)

describe('setupMswDevtools', () => {
  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    document.querySelectorAll(PANEL_TAG_NAME).forEach((el) => el.remove())
  })
  afterAll(() => server.close())

  it('ui를 끄면 패널을 마운트하지 않아야 함', () => {
    const handle = setupMswDevtools(server, {
      ui: false,
      storage: createMemoryStorage(),
    })

    expect(document.querySelector(PANEL_TAG_NAME)).toBeNull()

    handle.unmount()
  })

  it('ui를 켜면 패널을 body에 붙여야 함', () => {
    const handle = setupMswDevtools(server, {
      ui: true,
      storage: createMemoryStorage(),
    })

    const panel = document.querySelector(PANEL_TAG_NAME)

    expect(panel).not.toBeNull()
    expect(panel?.shadowRoot?.querySelector('.chip')).not.toBeNull()

    handle.unmount()
  })

  it('store와 controller를 함께 돌려줘야 함', () => {
    const handle = setupMswDevtools(server, {
      ui: false,
      storage: createMemoryStorage(),
    })

    expect(handle.controller.getEndpoints().map((e) => e.id)).toEqual([
      'GET https://api.test/users',
    ])
    expect(handle.store.getActiveCount()).toBe(0)

    handle.unmount()
  })

  it('UI 없이도 시나리오를 코드에서 재생할 수 있어야 함', async () => {
    const handle = setupMswDevtools(server, {
      ui: false,
      storage: createMemoryStorage(),
    })

    handle.store.importScenario(
      JSON.stringify({
        name: 'Checkout fails',
        overrides: {
          'GET https://api.test/users': {
            id: 'GET https://api.test/users',
            method: 'get',
            path: 'https://api.test/users',
            enabled: true,
            mode: 'json',
            status: 503,
            delay: 0,
            body: { message: 'maintenance' },
          },
        },
      }),
    )

    const response = await fetch('https://api.test/users')

    expect(response.status).toBe(503)

    handle.unmount()
  })

  it('unmount는 패널을 떼고 원래 핸들러를 되돌려야 함', async () => {
    const handle = setupMswDevtools(server, {
      ui: true,
      storage: createMemoryStorage(),
    })

    handle.store.upsertOverride({
      ...handle.controller.getOverride(handle.controller.getEndpoints()[0]),
      enabled: true,
      status: 500,
    })

    await expect(
      fetch('https://api.test/users').then((r) => r.status),
    ).resolves.toBe(500)

    handle.unmount()

    expect(document.querySelector(PANEL_TAG_NAME)).toBeNull()
    await expect(
      fetch('https://api.test/users').then((r) => r.status),
    ).resolves.toBe(200)
  })
})
