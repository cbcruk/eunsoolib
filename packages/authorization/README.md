# @cbcruk/authorization

표준 `Request`/`Response` 기반 HTTP Basic 인증 전략입니다.

Web 표준 `Request`만 받으므로 Cloudflare Workers, Deno, Bun, Node 18+ 등 Fetch API가
있는 환경이라면 프레임워크와 무관하게 쓸 수 있습니다.

## 설치

```bash
pnpm add @cbcruk/authorization
```

`Request`, `Response`, `atob`이 전역에 있어야 합니다.

## 사용법

```ts
import { BasicAuthStrategy } from '@cbcruk/authorization'

const strategy = new BasicAuthStrategy('admin', 'secret')

export default {
  fetch(request: Request) {
    const result = strategy.authorize(request)

    if (result instanceof Response) {
      return result // 401
    }

    return new Response('ok')
  },
}
```

### 전략 교체

`AuthStrategy` 인터페이스에 맞춰 직접 구현하면 호출부를 바꾸지 않고 인증 방식을 교체할 수
있습니다.

```ts
import type { AuthStrategy } from '@cbcruk/authorization'

const guard = (strategy: AuthStrategy, request: Request) =>
  strategy.authorize(request)
```

## API

### `new BasicAuthStrategy(username, password)`

기대하는 자격 증명을 받아 전략 인스턴스를 만듭니다.

### `strategy.authorize(request)`

`Authorization: Basic <base64>` 헤더를 디코딩해 생성자 값과 비교합니다.

- 일치하면 `{ ok: true }`를 반환합니다.
- 헤더가 없거나, `Basic `으로 시작하지 않거나, 디코딩에 실패하거나, 값이 다르면
  `WWW-Authenticate: Basic realm="Secure Area"` 헤더와 본문 `인증이 필요합니다.`를 담은
  401 `Response`를 반환합니다.

### 타입

| 타입           | 정의                                                      |
| -------------- | --------------------------------------------------------- |
| `AuthResult`   | `{ ok: boolean }`                                         |
| `AuthStrategy` | `{ authorize(request: Request): AuthResult \| Response }` |

## 제약

- realm과 401 응답 본문은 고정값이며 옵션으로 바꿀 수 없습니다.
- 비밀번호에 `:`가 들어가면 첫 `:` 이후 일부만 비교되어 인증에 실패합니다.
- 비교는 일반 `===`이며 상수 시간 비교가 아닙니다.
