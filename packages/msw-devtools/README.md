# @eunsoolib/msw-devtools

MSW 핸들러를 브라우저 런타임에서 조작하는 레이어

관찰만 하는 devtools가 아니라 역으로 응답을 바꿔 넣는 쪽이다.

## 설치

```bash
pnpm add -D @eunsoolib/msw-devtools
```

`msw@^2`가 peer dependency다.

## 왜 이 구조인가

핸들러는 클로저라 직렬화할 수 없다. 그래서 스토리지에 저장하는 건 **오버라이드 데이터**이고, 핸들러는 매 변경마다 그 데이터로부터 새로 컴파일된다. 데이터는 한 방향으로만 흐른다.

```
Storage ──▶ DevtoolsStore ──▶ compileScenario() ──▶ worker.use(...)
              ▲
              └── MswDevtoolsPanel (web component)
```

기존 핸들러 코드는 손대지 않는다. `listHandlers()`로 등록된 핸들러의 `info`를 읽어 엔드포인트 목록을 만들고, 오버라이드는 그 위에 런타임 핸들러로 얹힌다. MSW에서 런타임 핸들러가 초기 핸들러보다 우선하기 때문에 성립하는 방식이다.

## 사용법

```ts
import { setupWorker } from 'msw/browser'
import { handlers } from './mocks/handlers'

const worker = setupWorker(...handlers)

if (import.meta.env.DEV) {
  const { setupMswDevtools } = await import('@eunsoolib/msw-devtools')
  setupMswDevtools(worker)
}

await worker.start()
```

동적 import + DEV 가드는 선택이 아니다. 이걸 정적으로 import하면 패널이 프로덕션 번들에 그대로 실린다.

### 시나리오

엔드포인트별 토글은 금방 무너진다. 실제 단위는 시나리오 — 이름 붙은 오버라이드 묶음("결제 500", "빈 목록")이다. 패널에서 Copy하면 JSON이 나오고, 그대로 버그 리포트에 붙이거나 테스트에 넣을 수 있다.

```ts
import { setupServer } from 'msw/node'
import { setupMswDevtools } from '@eunsoolib/msw-devtools'

const { store, unmount } = setupMswDevtools(server, { ui: false, storage })
store.importScenario(await readFile('./scenarios/checkout-fails.json', 'utf8'))
```

브라우저에서 손으로 만든 상태를 테스트에서 그대로 돌리는 게 이 레이어의 실제 값어치다.

### 오버라이드 모드

| 모드            | 동작                                            |
| --------------- | ----------------------------------------------- |
| `json`          | `status`와 `body`로 응답을 만든다               |
| `passthrough`   | 등록된 핸들러를 건너뛰고 실제 서버로 보낸다     |
| `network-error` | 전송 계층에서 실패시킨다. 끊긴 연결과 같은 모양 |

`delay`는 밀리초, 또는 응답하지 않고 매달아두는 `'infinite'`.

## API

| 이름                                  | 역할                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `setupMswDevtools`                    | store · controller · 패널을 한 번에 물린다. 보통 이것만 쓴다                            |
| `DevtoolsStore`                       | 오버라이드 데이터의 단일 소유자. localStorage 동기 hydrate + BroadcastChannel 탭 동기화 |
| `DevtoolsController`                  | store 변경 → `resetHandlers()` + `use()`. MSW로 향하는 유일한 변경 경로                 |
| `introspectEndpoints`                 | `listHandlers()` → 엔드포인트 목록                                                      |
| `compileOverride` · `compileScenario` | 오버라이드 데이터 → `RequestHandler` (단방향)                                           |
| `MswDevtoolsPanel` · `definePanel`    | shadow DOM 커스텀 엘리먼트 패널                                                         |
| `escapeHtml` · `overrideTag`          | 패널이 문자열 마크업을 만들 때 쓰는 헬퍼                                                |

### 파일

| 파일                         | 역할                                                |
| ---------------------------- | --------------------------------------------------- |
| `src/types.ts`               | 직렬화 가능한 상태 정의. 함수가 들어가면 안 되는 곳 |
| `src/devtools-store.ts`      | 영속과 탭 동기화                                    |
| `src/introspect.ts`          | 등록된 핸들러 읽기                                  |
| `src/compile.ts`             | 데이터 → 핸들러                                     |
| `src/devtools-controller.ts` | MSW에 설치                                          |
| `src/panel.ts`               | 패널 컴포넌트                                       |
| `src/panel.styles.ts`        | 패널의 shadow DOM 스타일                            |
| `src/panel.utils.ts`         | 이스케이프와 행 라벨                                |
| `src/setup.ts`               | 조립 진입점                                         |

## 하지 않는 것

- **GraphQL 핸들러.** `info`가 path 대신 operation을 들고 있어 같은 키로 다룰 수 없다.
- **RegExp path 핸들러.** 오버라이드를 걸 안정적인 문자열 id가 없다.
- **요청 매칭 조건.** 지금은 method + path 단위. 쿼리/바디별 분기는 없다.

`MswTarget.listHandlers()`가 `readonly unknown[]`인 것도 이 때문이다. msw의 핸들러 배열에는 `WebSocketHandler`처럼 `info`가 아예 없는 종류까지 섞여 오므로, 어떤 구조적 형태를 적어두든 실제 `setupServer()` 결과가 거기 맞지 않는다. 좁히는 일은 `introspectEndpoints`가 런타임에 한다.

## 알려진 함정

- **영속된 오버라이드가 유령 버그를 만든다.** 3주 전 켜둔 500이 "왜 갑자기 안 되지"가 된다. 그래서 접힌 칩이 활성 개수를 항상 amber로 띄우고, 절대 완전히 숨지 않는다.
- **바디는 자유 JSON이다.** 타입과 즉시 드리프트한다. 다음 단계는 Zod/OpenAPI 스키마에서 폼을 파생시키는 것 — 그러면 응답 편집기가 아니라 데이터 편집기가 된다.
- `resetHandlers()`는 전체 교체다. devtools 바깥에서 `worker.use()`를 직접 호출하면 다음 apply에서 날아간다.
- **`dispose()`를 잊지 말 것.** `DevtoolsStore`가 여는 `BroadcastChannel`은 node에서 이벤트 루프를 붙잡는다. 브라우저에서는 `setupMswDevtools`가 돌려주는 `unmount()`가 대신 처리한다.

## 테스트

```bash
pnpm test:run packages/msw-devtools
```

| 파일                              | 검증 대상                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| `src/introspect.test.ts`          | 발견 · 정렬 · 중복 제거, RegExp/GraphQL 제외                 |
| `src/compile.test.ts`             | 세 모드의 실제 응답, delay, passthrough가 실제 서버에 닿는지 |
| `src/devtools-store.test.ts`      | hydrate · 손상 복구 · 시나리오 · export/import · 영속        |
| `src/devtools-controller.test.ts` | 발견 → 적용 → 해제 → export/import → 재기동 → dispose        |
| `src/panel.test.ts`               | 칩 · 목록 · 편집기 · 시나리오 전환                           |
| `src/setup.test.ts`               | 마운트 여부, UI 없는 재생, unmount 원복                      |

`compile.test.ts`의 passthrough 검증은 `node:http`로 실제 로컬 서버를 띄운다 — "핸들러를 건너뛴다"는 주장은 진짜 네트워크에 닿아야만 확인되기 때문이다.
