import { compileScenario } from './compile'
import { introspectEndpoints } from './introspect'
import type { DevtoolsStore } from './devtools-store'
import type { EndpointInfo, MswTarget, Override } from './types'

/**
 * MSW로 향하는 유일한 변경 경로.
 *
 * store가 바뀔 때마다 활성 시나리오를 다시 컴파일해 런타임 핸들러로 설치한다.
 * MSW에서 런타임 핸들러가 setup 시점 핸들러보다 우선하기 때문에, 기존 핸들러
 * 코드를 건드리지 않고도 응답을 갈아 끼울 수 있다.
 */
export class DevtoolsController {
  private endpoints: EndpointInfo[] = []
  private unsubscribe: () => void
  private target: MswTarget
  /** 오버라이드 데이터를 읽어 오는 store. */
  readonly store: DevtoolsStore

  /**
   * 엔드포인트를 읽고 store를 구독한 뒤, 활성 시나리오를 곧바로 한 번 설치한다.
   *
   * @param target - `setupWorker()` 또는 `setupServer()` 결과.
   * @param store - 활성 시나리오를 읽어 올 store.
   */
  constructor(target: MswTarget, store: DevtoolsStore) {
    this.target = target
    this.store = store
    this.endpoints = introspectEndpoints(target)
    this.unsubscribe = store.subscribe(() => this.apply())
    this.apply()
  }

  /**
   * 활성 시나리오를 런타임 핸들러로 설치한다.
   *
   * 인자 없는 `resetHandlers()`는 런타임 핸들러를 버리고 앱의 원래 집합을
   * 되돌린다. 즉 이건 누적이 아니라 전체 교체다.
   */
  apply(): void {
    this.target.resetHandlers()

    const handlers = compileScenario(this.store.getActiveScenario().overrides)
    if (handlers.length > 0) this.target.use(...handlers)
  }

  /**
   * 등록된 핸들러를 다시 읽는다. 앱의 일부를 지연 로딩한 뒤에 호출한다.
   *
   * @returns 갱신된 엔드포인트 목록.
   */
  refresh(): EndpointInfo[] {
    this.endpoints = introspectEndpoints(this.target)

    return this.endpoints
  }

  /**
   * 마지막으로 읽어 둔 엔드포인트 목록.
   *
   * 핸들러를 다시 읽지 않는다. 필요하면 {@linkcode DevtoolsController.refresh}를 쓴다.
   */
  getEndpoints(): EndpointInfo[] {
    return this.endpoints
  }

  /**
   * 엔드포인트에 걸린 오버라이드. 없으면 저장되지 않은 기본값을 돌려준다.
   *
   * 패널이 편집을 시작할 때 빈 폼 대신 쓸 값이 항상 있게 하려는 것이다.
   */
  getOverride(endpoint: EndpointInfo): Override {
    return (
      this.store.getActiveScenario().overrides[endpoint.id] ?? {
        id: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        enabled: false,
        mode: 'json',
        status: 200,
        delay: 0,
        body: null,
      }
    )
  }

  /** 구독을 끊고 앱의 원래 핸들러를 되돌린다. store는 건드리지 않는다. */
  dispose(): void {
    this.unsubscribe()
    this.target.resetHandlers()
  }
}
