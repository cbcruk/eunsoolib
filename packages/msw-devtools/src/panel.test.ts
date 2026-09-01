import { DevtoolsController } from './devtools-controller'
import { DevtoolsStore } from './devtools-store'
import { MswDevtoolsPanel, PANEL_TAG_NAME, definePanel } from './panel'
import { createMemoryStorage } from './test-storage'
import type { HandlerLike, MswTarget } from './types'

const HANDLERS: HandlerLike[] = [
  { info: { method: 'GET', path: '/users' } },
  { info: { method: 'POST', path: '/orders' } },
]

function mount(handlers: HandlerLike[] = HANDLERS) {
  const target: MswTarget = {
    listHandlers: () => handlers,
    use: () => {},
    resetHandlers: () => {},
  }

  const store = new DevtoolsStore(createMemoryStorage())
  const controller = new DevtoolsController(target, store)

  definePanel()
  const panel = document.createElement(PANEL_TAG_NAME) as MswDevtoolsPanel
  document.body.append(panel)
  panel.attach(controller)

  const root = panel.shadowRoot!
  const click = (selector: string): void => {
    const el = root.querySelector<HTMLElement>(selector)
    if (!el) throw new Error(`No element matched ${selector}`)
    el.click()
  }

  return {
    store,
    controller,
    root,
    click,
    openPanel: () => click('.chip'),
    dispose: () => {
      panel.remove()
      controller.dispose()
      store.dispose()
    },
  }
}

describe('MswDevtoolsPanel 칩', () => {
  it('접힌 상태에서는 칩만 그려야 함', () => {
    const { root, dispose } = mount()

    expect(root.querySelector('.chip')).not.toBeNull()
    expect(root.querySelector('.panel')).toBeNull()

    dispose()
  })

  it('오버라이드가 없으면 개수를 띄우지 않아야 함', () => {
    const { root, dispose } = mount()

    expect(root.querySelector('.count')).toBeNull()
    expect(root.querySelector('.chip')?.getAttribute('data-live')).toBe('false')

    dispose()
  })

  it('활성 오버라이드 수를 칩에 항상 띄워야 함', () => {
    const { store, controller, root, dispose } = mount()

    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
    })

    expect(root.querySelector('.count')?.textContent).toBe('1')
    expect(root.querySelector('.chip')?.getAttribute('data-live')).toBe('true')

    dispose()
  })
})

describe('MswDevtoolsPanel 목록', () => {
  it('칩을 누르면 패널이 열려야 함', () => {
    const { root, openPanel, dispose } = mount()

    openPanel()

    expect(root.querySelector('.panel')).not.toBeNull()

    dispose()
  })

  it('발견된 엔드포인트를 path 순으로 보여줘야 함', () => {
    const { root, openPanel, dispose } = mount()

    openPanel()

    expect(
      [...root.querySelectorAll('.row .path')].map((e) => e.textContent),
    ).toEqual(['/orders', '/users'])

    dispose()
  })

  it('엔드포인트가 없으면 안내 문구를 보여줘야 함', () => {
    const { root, openPanel, dispose } = mount([])

    openPanel()

    expect(root.querySelector('.empty')?.textContent).toContain(
      'No handlers registered yet',
    )

    dispose()
  })

  it('행을 누르면 편집기가 열려야 함', () => {
    const { root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    expect(root.querySelector('.editor')).not.toBeNull()
    expect(root.querySelector('.row')?.getAttribute('aria-expanded')).toBe(
      'true',
    )

    dispose()
  })

  it('같은 행을 다시 누르면 편집기가 닫혀야 함', () => {
    const { root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')
    click('.row')

    expect(root.querySelector('.editor')).toBeNull()

    dispose()
  })

  it('켜진 오버라이드는 행에 상태 코드를 붙여야 함', () => {
    const { store, controller, root, openPanel, dispose } = mount()

    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
      status: 500,
    })
    openPanel()

    expect(root.querySelector('.row[data-live="true"] .tag')?.textContent).toBe(
      '500',
    )

    dispose()
  })
})

describe('MswDevtoolsPanel 편집', () => {
  it('Turn on 버튼이 오버라이드를 켜야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')
    click('.editor [data-act="toggle-override"]')

    expect(store.getActiveCount()).toBe(1)
    expect(
      root.querySelector('.editor [data-act="toggle-override"]')?.textContent,
    ).toContain('Turn off')

    dispose()
  })

  it('mode를 바꾸면 오버라이드가 켜지면서 반영돼야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    const select = root.querySelector<HTMLSelectElement>('[data-field="mode"]')!
    select.value = 'network-error'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    const override = Object.values(store.getActiveScenario().overrides)[0]

    expect(override).toMatchObject({ mode: 'network-error', enabled: true })

    dispose()
  })

  it('status를 바꾸면 숫자로 저장해야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    const input = root.querySelector<HTMLInputElement>('[data-field="status"]')!
    input.value = '503'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(Object.values(store.getActiveScenario().overrides)[0].status).toBe(
      503,
    )

    dispose()
  })

  it('delay에 infinite를 넣으면 문자열로 저장해야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    const input = root.querySelector<HTMLInputElement>('[data-field="delay"]')!
    input.value = 'infinite'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(Object.values(store.getActiveScenario().overrides)[0].delay).toBe(
      'infinite',
    )

    dispose()
  })

  it('body에 유효한 JSON을 넣으면 파싱해 저장해야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    const textarea = root.querySelector<HTMLTextAreaElement>(
      '[data-field="body"]',
    )!
    textarea.value = '{"message":"boom"}'
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    expect(Object.values(store.getActiveScenario().overrides)[0].body).toEqual({
      message: 'boom',
    })

    dispose()
  })

  it('body가 깨진 JSON이면 저장하지 않고 오류를 보여줘야 함', () => {
    const { store, root, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')

    const textarea = root.querySelector<HTMLTextAreaElement>(
      '[data-field="body"]',
    )!
    textarea.value = '{ not json'
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    expect(store.getActiveCount()).toBe(0)
    expect(root.querySelector('.error')).not.toBeNull()

    dispose()
  })

  it('Remove가 오버라이드를 지워야 함', () => {
    const { store, openPanel, click, dispose } = mount()

    openPanel()
    click('.row')
    click('.editor [data-act="toggle-override"]')
    click('[data-act="remove"]')

    expect(store.getActiveScenario().overrides).toEqual({})

    dispose()
  })

  it('Turn all off가 활성 시나리오를 비워야 함', () => {
    const { store, controller, openPanel, click, dispose } = mount()

    for (const endpoint of controller.getEndpoints()) {
      store.upsertOverride({
        ...controller.getOverride(endpoint),
        enabled: true,
      })
    }
    openPanel()
    click('[data-act="clear"]')

    expect(store.getActiveCount()).toBe(0)

    dispose()
  })
})

describe('MswDevtoolsPanel 시나리오', () => {
  it('시나리오를 고르면 활성 시나리오가 바뀌어야 함', () => {
    const { store, root, openPanel, dispose } = mount()

    const saved = store.saveAsScenario('Checkout fails')
    store.setActiveScenario('draft')
    openPanel()

    const select = root.querySelector<HTMLSelectElement>(
      '[data-field="scenario"]',
    )!
    select.value = saved.id
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(store.getState().activeId).toBe(saved.id)

    dispose()
  })

  it('Draft에서는 Delete 버튼을 숨겨야 함', () => {
    const { root, openPanel, dispose } = mount()

    openPanel()

    expect(root.querySelector('[data-act="delete-scenario"]')).toBeNull()

    dispose()
  })

  it('이름 붙은 시나리오에서는 Delete 버튼을 보여줘야 함', () => {
    const { store, root, openPanel, dispose } = mount()

    store.saveAsScenario('Checkout fails')
    openPanel()

    expect(root.querySelector('[data-act="delete-scenario"]')).not.toBeNull()

    dispose()
  })

  it('Rescan이 엔드포인트를 다시 읽어야 함', () => {
    const handlers: HandlerLike[] = [
      { info: { method: 'GET', path: '/users' } },
    ]
    const { root, openPanel, click, dispose } = mount(handlers)

    openPanel()
    handlers.push({ info: { method: 'GET', path: '/added' } })
    click('[data-act="refresh"]')

    expect(root.querySelectorAll('.row')).toHaveLength(2)

    dispose()
  })
})

describe('MswDevtoolsPanel 정리', () => {
  it('DOM에서 떨어지면 store 구독을 끊어야 함', () => {
    const { store, controller, root, dispose } = mount()

    dispose()
    store.upsertOverride({
      ...controller.getOverride(controller.getEndpoints()[0]),
      enabled: true,
    })

    expect(root.querySelector('.count')).toBeNull()
  })
})
