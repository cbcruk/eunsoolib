/**
 * 스토리지에 영속되는 상태의 정의.
 *
 * 이 파일에는 함수가 들어갈 수 없다. 설계의 전제 자체가 "상태는 직렬화 가능하고
 * 핸들러는 거기서 파생된다"이기 때문이다. 반대 방향은 없다 — resolver는
 * 클로저라 스토리지에 되쓸 수 없다.
 *
 * @module
 */

/** 오버라이드를 걸 수 있는 HTTP 메서드. msw의 `http` 팩토리 키와 같다. */
export type HttpMethodName =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head'

/**
 * 오버라이드가 요청을 처리하는 방식.
 *
 * - `json` — `status`와 `body`로 응답을 만든다.
 * - `passthrough` — 등록된 핸들러를 건너뛰고 실제 서버로 보낸다.
 * - `network-error` — 전송 계층에서 실패시킨다. 끊긴 연결과 같은 모양.
 */
export type OverrideMode = 'json' | 'passthrough' | 'network-error'

/** 엔드포인트 하나에 걸린 오버라이드. 이 객체가 그대로 스토리지에 들어간다. */
export interface Override {
  /** `${METHOD} ${path}` — {@linkcode EndpointInfo.id}와 같은 형태. */
  id: string
  method: HttpMethodName
  path: string
  enabled: boolean
  mode: OverrideMode
  /** `mode`가 `json`일 때만 쓴다. */
  status: number
  /** 밀리초, 또는 응답하지 않고 매달아두는 `'infinite'`. */
  delay: number | 'infinite'
  /** 파싱된 JSON. `mode`가 `json`일 때만 쓴다. */
  body: unknown
}

/**
 * 이름 붙은 오버라이드 묶음.
 *
 * 엔드포인트별 토글은 금방 무너진다. 실제 단위는 시나리오 — "결제 500",
 * "빈 목록"처럼 함께 켜져야 의미가 있는 묶음이다.
 */
export interface Scenario {
  id: string
  name: string
  overrides: Record<string, Override>
}

/** 스토리지에 저장되는 최상위 상태. */
export interface DevtoolsState {
  version: 1
  scenarios: Scenario[]
  activeId: string
}

/** 등록된 핸들러를 읽어 발견한 엔드포인트. */
export interface EndpointInfo {
  id: string
  method: HttpMethodName
  path: string
}

/**
 * 핸들러에서 읽어내는 부분만 추린 구조적 타입.
 *
 * msw의 `RequestHandler`를 그대로 요구하지 않는 이유는 두 가지다. GraphQL
 * 핸들러처럼 `method`/`path`가 아예 없는 종류도 같은 배열에 섞여 오고, 테스트에서
 * plain object로 핸들러 목록을 흉내낼 수 있어야 한다.
 *
 * `info`가 `unknown`인 것도 같은 이유다. msw가 선언한 `info`는 종류마다 모양이
 * 다르고 인덱스 시그니처도 없어서, 어떤 형태를 적어두든 실제
 * `RequestHandler`가 거기 맞지 않는다. 좁히는 일은
 * {@linkcode introspectEndpoints}가 런타임에 한다.
 *
 * 이건 introspect가 무엇을 읽는지에 대한 문서이자 테스트에서 핸들러를 흉내낼 때의
 * 최소 형태다. {@linkcode MswTarget}은 이보다도 느슨한 `unknown`을 받는다 —
 * `WebSocketHandler`처럼 `info`가 아예 없는 종류도 같은 배열에 섞여 오기 때문이다.
 */
export interface HandlerLike {
  readonly info?: unknown
}

/**
 * `setupWorker()`와 `setupServer()` 결과를 함께 덮는 구조적 타입.
 *
 * 덕분에 store와 controller가 UI 없는 node 테스트에서도 그대로 쓰인다.
 */
export interface MswTarget {
  listHandlers(): readonly unknown[]
  use(...handlers: unknown[]): void
  resetHandlers(...handlers: unknown[]): void
}
