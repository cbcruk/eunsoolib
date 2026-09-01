import { DRAFT_ID } from './devtools-store'
import { PANEL_STYLES } from './panel.styles'
import { escapeHtml, overrideTag } from './panel.utils'
import type { DevtoolsController } from './devtools-controller'
import type { EndpointInfo, Override, OverrideMode } from './types'

/** 패널이 등록되는 커스텀 엘리먼트 이름. */
export const PANEL_TAG_NAME = 'msw-devtools'

const MODES: OverrideMode[] = ['json', 'passthrough', 'network-error']

/**
 * 오버라이드 패널. React 컴포넌트가 아니라 웹 컴포넌트다.
 *
 * MSW는 프레임워크 중립이고, 패널이 렌더러를 쓰지 않는 앱에까지 렌더러를 끌고
 * 들어가서는 안 된다. shadow DOM이라 호스트 앱의 스타일시트도 여기 닿지 못한다.
 *
 * 직접 만들 일은 없다 — {@linkcode setupMswDevtools}가 붙이고 떼어낸다.
 */
export class MswDevtoolsPanel extends HTMLElement {
  private controller!: DevtoolsController
  private root = this.attachShadow({ mode: 'open' })
  private open = false
  private openId: string | null = null
  private bodyError = ''
  private unsubscribe: (() => void) | null = null

  /** controller를 물리고 첫 렌더를 한다. 이 호출 전까지 패널은 비어 있다. */
  attach(controller: DevtoolsController): void {
    this.controller = controller
    this.unsubscribe = controller.store.subscribe(() => this.render())
    this.root.addEventListener('click', this.onClick)
    this.root.addEventListener('change', this.onChange)
    this.render()
  }

  /** DOM에서 떨어지면 store 구독을 끊는다. */
  disconnectedCallback(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private commit(patch: Partial<Override>): void {
    const endpoint = this.controller
      .getEndpoints()
      .find((e) => e.id === this.openId)
    if (!endpoint) return

    this.controller.store.upsertOverride({
      ...this.controller.getOverride(endpoint),
      ...patch,
    })
  }

  private onClick = (event: Event): void => {
    const el = (event.target as HTMLElement)?.closest('[data-act]')
    if (!(el instanceof HTMLElement)) return

    const { act, id } = el.dataset
    const store = this.controller.store

    switch (act) {
      case 'toggle-panel':
        this.open = !this.open
        this.render()
        break

      case 'open-row':
        this.openId = this.openId === id ? null : (id ?? null)
        this.bodyError = ''
        this.render()
        break

      case 'toggle-override': {
        const endpoint = this.controller.getEndpoints().find((e) => e.id === id)
        if (!endpoint) return

        const current = this.controller.getOverride(endpoint)
        store.upsertOverride({ ...current, enabled: !current.enabled })
        break
      }

      case 'remove':
        if (this.openId) store.removeOverride(this.openId)
        break

      case 'clear':
        store.clearActive()
        break

      case 'save': {
        const name = prompt('Name this scenario', 'Empty list')
        if (name) store.saveAsScenario(name)
        break
      }

      case 'delete-scenario':
        store.deleteScenario(store.getState().activeId)
        break

      case 'copy':
        void navigator.clipboard?.writeText(store.exportScenario())
        break

      case 'paste': {
        const json = prompt('Paste an exported scenario')
        if (!json) return

        try {
          store.importScenario(json)
        } catch (error) {
          alert(`Import failed. ${(error as Error).message}`)
        }
        break
      }

      case 'refresh':
        this.controller.refresh()
        this.render()
        break
    }
  }

  private onChange = (event: Event): void => {
    const el = event.target as HTMLElement
    const field = el.dataset.field
    if (!field) return

    const value = (el as HTMLInputElement).value

    if (field === 'scenario') {
      this.controller.store.setActiveScenario(value)
      return
    }

    if (field === 'mode') {
      this.commit({ mode: value as OverrideMode, enabled: true })
      return
    }

    if (field === 'status') {
      this.commit({ status: Number(value) || 200, enabled: true })
      return
    }

    if (field === 'delay') {
      this.commit({
        delay: value === 'infinite' ? 'infinite' : Number(value) || 0,
        enabled: true,
      })
      return
    }

    if (field === 'body') {
      try {
        this.commit({
          body: value.trim() ? JSON.parse(value) : null,
          enabled: true,
        })
        this.bodyError = ''
      } catch (error) {
        this.bodyError = (error as Error).message
      }

      this.render()
    }
  }

  private renderRow(endpoint: EndpointInfo): string {
    const override = this.controller.getOverride(endpoint)
    const isOpen = this.openId === endpoint.id

    const row = `
      <button class="row" data-act="open-row" data-id="${escapeHtml(endpoint.id)}"
        data-open="${isOpen}" data-live="${override.enabled}" data-mode="${override.mode}"
        aria-expanded="${isOpen}">
        <span class="method m-${endpoint.method}">${endpoint.method.toUpperCase()}</span>
        <span class="path mono">${escapeHtml(endpoint.path)}</span>
        <span class="tag">${overrideTag(override)}</span>
      </button>`

    return isOpen ? row + this.renderEditor(override) : row
  }

  private renderEditor(override: Override): string {
    const modeOptions = MODES.map(
      (m) =>
        `<option value="${m}" ${m === override.mode ? 'selected' : ''}>${m}</option>`,
    ).join('')

    return `
      <div class="editor">
        <div class="fields">
          <div class="field grow">
            <label for="mode">Respond with</label>
            <select id="mode" data-field="mode">${modeOptions}</select>
          </div>
          <div class="field" style="width:78px">
            <label for="status">Status</label>
            <input id="status" class="mono" type="number" data-field="status"
              value="${override.status}" ${override.mode === 'json' ? '' : 'disabled'}>
          </div>
          <div class="field" style="width:88px">
            <label for="delay">Delay (ms)</label>
            <input id="delay" class="mono" data-field="delay" value="${override.delay}">
          </div>
        </div>
        ${
          override.mode === 'json'
            ? `<textarea data-field="body" spellcheck="false"
                 aria-label="Response body">${escapeHtml(JSON.stringify(override.body ?? null, null, 2))}</textarea>`
            : `<p class="hint">${
                override.mode === 'passthrough'
                  ? 'Requests reach the real server. The registered handler is skipped.'
                  : 'The request fails at the transport layer, the way a dropped connection does.'
              }</p>`
        }
        ${this.bodyError ? `<p class="error">${escapeHtml(this.bodyError)}</p>` : ''}
        <div class="fields" style="margin:8px 0 0">
          <button data-act="toggle-override" data-id="${escapeHtml(override.id)}">
            ${override.enabled ? 'Turn off' : 'Turn on'}
          </button>
          <button class="danger" data-act="remove">Remove</button>
        </div>
      </div>`
  }

  private render(): void {
    // 커서 아래에서 다시 그리지 않는다. 값은 blur에서 커밋되므로 store는 이미
    // 옳고, 여기서 repaint하면 입력만 잡아먹는다.
    const focused = this.root.activeElement
    if (
      focused instanceof HTMLElement &&
      /INPUT|TEXTAREA/.test(focused.tagName)
    ) {
      return
    }

    const store = this.controller.store
    const count = store.getActiveCount()

    if (!this.open) {
      this.root.innerHTML = `<style>${PANEL_STYLES}</style>
        <button class="chip" data-act="toggle-panel" data-live="${count > 0}"
          aria-expanded="false">
          msw${count > 0 ? `<span class="count">${count}</span>` : ''}
        </button>`
      return
    }

    const state = store.getState()
    const endpoints = this.controller.getEndpoints()
    const options = state.scenarios
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}" ${s.id === state.activeId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`,
      )
      .join('')

    const list = endpoints.length
      ? endpoints.map((e) => this.renderRow(e)).join('')
      : `<p class="empty">No handlers registered yet. Start the worker first, then
           refresh this list. Handlers matched by RegExp and GraphQL operations
           are not listed — they have no stable path to key an override by.</p>`

    this.root.innerHTML = `<style>${PANEL_STYLES}</style>
      <div class="panel" role="dialog" aria-label="MSW devtools">
        <header>
          <select data-field="scenario" aria-label="Active scenario">${options}</select>
          <button data-act="save">Save as</button>
          ${state.activeId !== DRAFT_ID ? '<button class="danger" data-act="delete-scenario">Delete</button>' : ''}
          <button data-act="toggle-panel" aria-label="Close">✕</button>
        </header>
        <div class="list">${list}</div>
        <footer>
          <button data-act="refresh">Rescan</button>
          <button data-act="copy">Copy</button>
          <button data-act="paste">Paste</button>
          <span class="spacer"></span>
          <button class="danger" data-act="clear">Turn all off</button>
        </footer>
      </div>`
  }
}

/** 아직 등록되지 않았을 때만 커스텀 엘리먼트를 등록한다. 두 번 불러도 안전하다. */
export function definePanel(): void {
  if (!customElements.get(PANEL_TAG_NAME)) {
    customElements.define(PANEL_TAG_NAME, MswDevtoolsPanel)
  }
}
