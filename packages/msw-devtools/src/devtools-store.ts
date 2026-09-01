import type { DevtoolsState, Override, Scenario } from './types'

const STORAGE_KEY = 'msw-devtools:v1'
const CHANNEL_NAME = 'msw-devtools'

/** 항상 존재하는 시나리오. 이름 붙은 시나리오를 고르지 않은 편집은 여기로 들어간다. */
export const DRAFT_ID = 'draft'

/** 상태가 바뀔 때마다 호출되는 구독자. */
export type StoreListener = (state: DevtoolsState) => void

/**
 * 같은 밀리초에 두 번 저장해도 id가 겹치지 않도록 순번을 덧붙인다.
 * `Date.now()`만으로는 반복문이나 테스트에서 충돌한다.
 */
let sequence = 0

function nextScenarioId(): string {
  sequence += 1

  return `s_${Date.now().toString(36)}_${sequence.toString(36)}`
}

function draftScenario(): Scenario {
  return { id: DRAFT_ID, name: 'Draft', overrides: {} }
}

function emptyState(): DevtoolsState {
  return { version: 1, scenarios: [draftScenario()], activeId: DRAFT_ID }
}

/**
 * 오버라이드 데이터의 단일 소유자. 스토리지 영속과 탭 간 동기화를 함께 맡는다.
 *
 * 생성 시점에 **동기적으로** 읽는 게 핵심이다. controller는 앱이 첫 요청을 쏘기
 * 전에 상태를 손에 쥐고 있어야 하고, `await` 없이 그걸 약속할 수 있는 브라우저
 * 스토어는 `localStorage`뿐이다.
 *
 * @example 브라우저 밖에서 쓰기
 * ```ts
 * import { DevtoolsStore } from '@eunsoolib/msw-devtools'
 *
 * const store = new DevtoolsStore(memoryStorage)
 * store.importScenario(await readFile('./scenarios/checkout-fails.json', 'utf8'))
 * ```
 */
export class DevtoolsStore {
  private state: DevtoolsState
  private listeners = new Set<StoreListener>()
  private channel: BroadcastChannel | null = null
  private storage: Storage | undefined

  /**
   * @param storage 영속 대상. 생략하면 `globalThis.localStorage`를 쓰고,
   *   그것도 없으면 메모리에만 남는다.
   */
  constructor(storage: Storage | undefined = globalThis.localStorage) {
    this.storage = storage
    this.state = this.hydrate()

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<DevtoolsState>) => {
        this.state = event.data
        this.notify()
      }
    }
  }

  private hydrate(): DevtoolsState {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY)
      if (!raw) return emptyState()

      const parsed = JSON.parse(raw) as DevtoolsState
      if (parsed?.version !== 1 || !Array.isArray(parsed.scenarios)) {
        return emptyState()
      }
      if (!parsed.scenarios.some((s) => s.id === DRAFT_ID)) {
        parsed.scenarios.unshift(draftScenario())
      }
      if (!parsed.scenarios.some((s) => s.id === parsed.activeId)) {
        parsed.activeId = DRAFT_ID
      }

      return parsed
    } catch {
      return emptyState()
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state)
  }

  private commit(next: DevtoolsState): void {
    this.state = next

    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 용량 초과나 시크릿 모드 실패는 메모리 전용으로 낮춰 견딘다.
    }

    this.channel?.postMessage(next)
    this.notify()
  }

  private patchActive(patch: (scenario: Scenario) => Scenario): void {
    this.commit({
      ...this.state,
      scenarios: this.state.scenarios.map((s) =>
        s.id === this.state.activeId ? patch(s) : s,
      ),
    })
  }

  /** 현재 상태 전체. */
  getState(): DevtoolsState {
    return this.state
  }

  /** 지금 편집 대상인 시나리오. */
  getActiveScenario(): Scenario {
    return (
      this.state.scenarios.find((s) => s.id === this.state.activeId) ??
      this.state.scenarios[0]
    )
  }

  /** 지금 실제로 트래픽을 바꾸고 있는 오버라이드의 수. 패널의 칩에 그대로 뜬다. */
  getActiveCount(): number {
    return Object.values(this.getActiveScenario().overrides).filter(
      (o) => o.enabled,
    ).length
  }

  /**
   * 상태 변경을 구독한다.
   *
   * @returns 구독을 해제하는 함수.
   */
  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /** 존재하지 않는 id는 무시한다. */
  setActiveScenario(id: string): void {
    if (!this.state.scenarios.some((s) => s.id === id)) return
    this.commit({ ...this.state, activeId: id })
  }

  /** 같은 id의 오버라이드가 있으면 덮어쓴다. */
  upsertOverride(override: Override): void {
    this.patchActive((s) => ({
      ...s,
      overrides: { ...s.overrides, [override.id]: override },
    }))
  }

  removeOverride(id: string): void {
    this.patchActive((s) => {
      const { [id]: _removed, ...rest } = s.overrides

      return { ...s, overrides: rest }
    })
  }

  /** 비상 정지 버튼. 활성 시나리오의 오버라이드를 전부 지운다. */
  clearActive(): void {
    this.patchActive((s) => ({ ...s, overrides: {} }))
  }

  /**
   * 지금 편집 중인 내용을 이름 붙은 시나리오로 굳힌다.
   *
   * @param name 시나리오 이름.
   * @returns 새로 만들어져 활성화된 시나리오.
   */
  saveAsScenario(name: string): Scenario {
    const scenario: Scenario = {
      id: nextScenarioId(),
      name,
      overrides: structuredClone(this.getActiveScenario().overrides),
    }

    this.commit({
      ...this.state,
      scenarios: [...this.state.scenarios, scenario],
      activeId: scenario.id,
    })

    return scenario
  }

  /** Draft는 지워지지 않는다. 활성 시나리오를 지우면 Draft로 돌아간다. */
  deleteScenario(id: string): void {
    if (id === DRAFT_ID) return

    this.commit({
      ...this.state,
      scenarios: this.state.scenarios.filter((s) => s.id !== id),
      activeId: this.state.activeId === id ? DRAFT_ID : this.state.activeId,
    })
  }

  /** 활성 시나리오를 JSON 문자열로. 버그 리포트에 그대로 붙일 수 있는 형태다. */
  exportScenario(): string {
    return JSON.stringify(this.getActiveScenario(), null, 2)
  }

  /**
   * 다른 기기·탭·버그 리포트에서 온 시나리오를 받는다.
   *
   * @param json {@linkcode DevtoolsStore.exportScenario}가 만든 문자열.
   * @returns 새로 만들어져 활성화된 시나리오.
   * @throws JSON이 아니거나 `overrides` 객체가 없으면 던진다.
   */
  importScenario(json: string): Scenario {
    const parsed = JSON.parse(json) as Scenario
    if (!parsed?.overrides || typeof parsed.overrides !== 'object') {
      throw new Error('Not a scenario: missing an overrides object.')
    }

    const scenario: Scenario = {
      id: nextScenarioId(),
      name: parsed.name || 'Imported',
      overrides: parsed.overrides,
    }

    this.commit({
      ...this.state,
      scenarios: [...this.state.scenarios, scenario],
      activeId: scenario.id,
    })

    return scenario
  }

  /**
   * 구독을 끊고 탭 동기화 채널을 닫는다.
   *
   * 열린 `BroadcastChannel`은 node에서 이벤트 루프를 붙잡으므로, 테스트나
   * 단명하는 프로세스에서는 반드시 호출해야 한다.
   */
  dispose(): void {
    this.listeners.clear()
    this.channel?.close()
    this.channel = null
  }
}
