import { DevtoolsController } from './devtools-controller'
import { DevtoolsStore } from './devtools-store'
import { PANEL_TAG_NAME, definePanel, type MswDevtoolsPanel } from './panel'
import type { MswTarget } from './types'

/** {@linkcode setupMswDevtools}의 옵션. */
export interface SetupOptions {
  /**
   * 패널을 마운트할지. 기본값은 `document`가 있으면 `true`.
   *
   * node 테스트에서는 꺼둔다 — UI 없이도 controller로 시나리오를 코드에서
   * 그대로 재생할 수 있다.
   */
  ui?: boolean
  /** 영속 대상. 생략하면 `globalThis.localStorage`. */
  storage?: Storage
}

/** {@linkcode setupMswDevtools}가 돌려주는 핸들. */
export interface DevtoolsHandle {
  controller: DevtoolsController
  store: DevtoolsStore
  /** 패널을 떼고, 핸들러를 되돌리고, 채널을 닫는다. */
  unmount(): void
}

/**
 * devtools를 MSW에 물린다.
 *
 * `setupWorker()` 직후에 부르면 되고, `start()` 전후는 상관없다 — 런타임
 * 핸들러는 setup 인스턴스가 들고 있기 때문이다.
 *
 * > 이 모듈과 호출부는 프로덕션 빌드에서 죽은 코드여야 한다.
 * > `import.meta.env.DEV` 같은 가드로 감싸지 않으면 패널이 그대로 실린다.
 *
 * @param target `setupWorker()` 또는 `setupServer()` 결과.
 * @param options 패널 마운트 여부와 스토리지.
 * @returns store · controller와 정리 함수를 담은 핸들.
 *
 * @example 브라우저에서 개발 중에만 켜기
 * ```ts
 * import { setupWorker } from 'msw/browser'
 * import { handlers } from './mocks/handlers'
 *
 * const worker = setupWorker(...handlers)
 *
 * if (import.meta.env.DEV) {
 *   const { setupMswDevtools } = await import('@eunsoolib/msw-devtools')
 *   setupMswDevtools(worker)
 * }
 *
 * await worker.start()
 * ```
 *
 * @example UI 없이 테스트에서 같은 시나리오 재생하기
 * ```ts
 * import { setupServer } from 'msw/node'
 * import { setupMswDevtools } from '@eunsoolib/msw-devtools'
 *
 * const { store, unmount } = setupMswDevtools(server, { ui: false, storage })
 * store.importScenario(await readFile('./scenarios/checkout-fails.json', 'utf8'))
 * ```
 *
 * 브라우저에서 손으로 만든 상태를 테스트에서 그대로 돌리는 게 이 레이어의 실제
 * 값어치다.
 */
export function setupMswDevtools(
  target: MswTarget,
  options: SetupOptions = {},
): DevtoolsHandle {
  const { ui = typeof document !== 'undefined', storage } = options

  const store = new DevtoolsStore(storage ?? globalThis.localStorage)
  const controller = new DevtoolsController(target, store)

  let element: MswDevtoolsPanel | null = null

  if (ui) {
    definePanel()
    element = document.createElement(PANEL_TAG_NAME) as MswDevtoolsPanel
    document.body.append(element)
    element.attach(controller)
  }

  return {
    controller,
    store,
    unmount() {
      element?.remove()
      controller.dispose()
      store.dispose()
    },
  }
}
