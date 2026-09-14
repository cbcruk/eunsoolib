# @cbcruk/authorization

표준 `Request`/`Response` 기반 HTTP Basic 인증 전략입니다.

Web 표준 `Request`만 받으므로 Cloudflare Workers, Deno, Bun, Node 18+ 등 Fetch API가
있는 환경이라면 프레임워크와 무관하게 쓸 수 있습니다.

## 설치

```bash
pnpm add @cbcruk/authorization
```

`Request`, `Response`, `atob`, `TextEncoder`, `TextDecoder`가 전역에 있어야 합니다.

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

- 스킴 이름(`Basic`)은 대소문자를 구분하지 않습니다(`basic`, `BASIC`도 허용).
- base64를 풀어 UTF-8로 디코딩하므로 non-ASCII 자격 증명도 비교할 수 있습니다.
- RFC 7617에 따라 첫 번째 `:`에서만 사용자명과 비밀번호를 나눕니다. 비밀번호에는 `:`가 들어가도
  됩니다.
- 사용자명과 비밀번호는 둘 다 상수 시간으로 비교합니다.

결과:

- 일치하면 `{ ok: true }`를 반환합니다.
- 헤더가 없거나, 스킴이 `Basic`이 아니거나, base64·UTF-8 디코딩에 실패하거나, `:`가 없거나, 값이
  다르면 `WWW-Authenticate: Basic realm="Secure Area"` 헤더와 본문 `인증이 필요합니다.`를 담은
  401 `Response`를 반환합니다.

### 타입

| 타입           | 정의                                                      |
| -------------- | --------------------------------------------------------- |
| `AuthResult`   | `{ ok: boolean }`                                         |
| `AuthStrategy` | `{ authorize(request: Request): AuthResult \| Response }` |

## 제약

- realm과 401 응답 본문은 고정값이며 옵션으로 바꿀 수 없습니다.
- 사용자명에 `:`가 들어간 자격 증명은 첫 `:`에서 잘리므로 인증할 수 없습니다(RFC 7617은
  user-id에 `:`를 허용하지 않습니다).
- UTF-8이 아닌 문자 집합(예: Latin-1)으로 인코딩된 자격 증명은 거부됩니다.
- 상수 시간 비교는 두 값 중 긴 쪽 길이만큼 반복하므로, 응답 시간으로 내용은 알 수 없지만 대략적인
  길이 차이까지 완전히 감추지는 않습니다.
