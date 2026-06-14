import { corsImageProxy } from './cors-image-proxy'

/**
 * Cloudflare Workers 진입점 예시.
 *
 * wrangler.toml 의 `main` 을 이 파일로 지정하고,
 * 아래 두 목록을 실제 환경에 맞게 교체한 뒤 `wrangler deploy` 로 배포합니다.
 *
 * 사용법: https://<worker-domain>/?url=<encoded-image-url>
 */
const handler = corsImageProxy({
  allowedOrigins: ['http://localhost:3000', '*.vercel.app'],
  allowedTargetDomains: [
    's3.amazonaws.com',
    's3.ap-northeast-2.amazonaws.com',
    'your-cdn.cloudfront.net',
  ],
})

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
