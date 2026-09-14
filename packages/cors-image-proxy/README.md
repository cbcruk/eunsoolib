# @cbcruk/cors-image-proxy

cross-origin 이미지를 Blob 으로 변환하기 위한 CORS 프록시 핸들러입니다. Cloudflare Workers 등 표준 `Request`/`Response` 를 사용하는 모든 런타임에서 동작합니다.

`allowedOrigins` 와 `allowedTargetDomains` 로 클라이언트와 대상 도메인을 모두 제한하여 open proxy 가 되는 것을 방지합니다.

## 설치

```bash
pnpm add @cbcruk/cors-image-proxy
```

표준 `Request`/`Response`와 `fetch`만 사용하므로 Cloudflare Workers, Deno, Node 18+ 등에서 동작합니다.

## 사용법

```ts
import { corsImageProxy } from '@cbcruk/cors-image-proxy'

const handler = corsImageProxy({
  allowedOrigins: ['http://localhost:3000', '*.vercel.app'],
  allowedTargetDomains: [
    'your-bucket.s3.amazonaws.com',
    'your-cdn.cloudfront.net',
  ],
  cacheTtl: 3600,
})

const response = await handler(request)
```

### Cloudflare Workers 배포

`src/cors-image-proxy.example.ts` 를 참고하세요.

```ts
const handler = corsImageProxy({ allowedOrigins, allowedTargetDomains })

export default {
  fetch: (request: Request) => handler(request),
}
```

```toml
# wrangler.toml
name = "cors-image-proxy"
main = "src/cors-image-proxy.example.ts"
compatibility_date = "2024-01-01"
```

```bash
npx wrangler dev      # 로컬 개발
npx wrangler deploy   # 배포
```

### 클라이언트 사용 예시

```ts
const PROXY_URL = 'https://cors-image-proxy.your-subdomain.workers.dev'

async function fetchImageAsBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(`${PROXY_URL}/?url=${encodeURIComponent(imageUrl)}`)
  return res.blob()
}
```

## API

### `corsImageProxy(options)`

`(request: Request) => Promise<Response>` 핸들러를 반환합니다.

#### 옵션

| 옵션                   | 타입        | 설명                                                                       |
| ---------------------- | ----------- | -------------------------------------------------------------------------- |
| `allowedOrigins`       | `string[]`  | 프록시를 사용할 수 있는 클라이언트 origin. `*.example.com` 와일드카드 지원 |
| `allowedTargetDomains` | `string[]`  | 프록시가 fetch 할 수 있는 이미지 호스트 (하위 도메인 포함)                 |
| `cacheTtl`             | `number`    | 캐시 수명(초). 기본값 `3600`                                               |
| `fetch`                | `FetchLike` | fetch 구현체. 테스트용 주입 가능. 기본값은 전역 `fetch`                    |

## 설계 노트

- `OPTIONS` (preflight): 허용된 origin 이면 204 + CORS 헤더, 아니면 403
- `GET`: origin·대상 도메인 검증 후 이미지를 스트리밍으로 프록시
- `HEAD`: `GET` 과 같은 검증 후 upstream 에도 `HEAD` 로 요청하고, 본문 없이 상태·헤더만 반환
- 그 외 메서드: 405 (`Allow: GET, HEAD, OPTIONS`)
- upstream 오류: 상태 코드 그대로 전파 / fetch 실패: 502
- 허용된 origin 의 요청이면 400·403·405·upstream 오류·502 등 에러 응답에도 CORS 헤더를 붙여, 브라우저 클라이언트가 네트워크 에러 대신 실제 상태 코드를 확인할 수 있습니다. 허용되지 않은 origin 에는 CORS 헤더를 붙이지 않습니다.
