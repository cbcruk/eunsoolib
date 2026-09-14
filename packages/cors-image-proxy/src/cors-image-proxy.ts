import type {
  CorsImageProxyHandler,
  CorsImageProxyOptions,
} from './cors-image-proxy.types'
import {
  corsHeaders,
  isOriginAllowed,
  isTargetAllowed,
} from './cors-image-proxy.utils'

const DEFAULT_CACHE_TTL = 3600
const ALLOWED_METHODS = 'GET, HEAD, OPTIONS'

/**
 * Creates a fetch handler that proxies whitelisted images and adds CORS headers.
 *
 * The handler answers `OPTIONS` preflights for allowed origins with `204`, and
 * rejects methods other than `GET`, `HEAD`, and `OPTIONS` with `405`. A `GET`
 * or `HEAD` must come from an allowed origin and carry a `?url=` whose hostname
 * is in `allowedTargetDomains`; otherwise it responds with `403` or `400`.
 * `HEAD` is forwarded upstream as `HEAD` and answered without a body. A non-OK
 * upstream response is returned as `Upstream error: <status>` with the same
 * status, and a thrown fetch results in `502`.
 *
 * Every response to an allowed origin, including `400`/`403`/`405` and
 * upstream failures, carries the CORS headers from {@link corsHeaders}, so the
 * browser exposes the real status to the client instead of a network error.
 *
 * @example Cloudflare Workers entry
 * ```ts
 * import { corsImageProxy } from '@cbcruk/cors-image-proxy'
 *
 * const handler = corsImageProxy({
 *   allowedOrigins: ['http://localhost:3000', '*.vercel.app'],
 *   allowedTargetDomains: ['s3.amazonaws.com', 'your-cdn.cloudfront.net'],
 * })
 *
 * export default {
 *   fetch(request: Request): Promise<Response> {
 *     return handler(request)
 *   },
 * }
 * ```
 */
export function corsImageProxy(
  options: CorsImageProxyOptions,
): CorsImageProxyHandler {
  const {
    allowedOrigins,
    allowedTargetDomains,
    cacheTtl = DEFAULT_CACHE_TTL,
    fetch: fetchImpl = fetch,
  } = options

  return async function handler(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin')
    const originAllowed = isOriginAllowed(origin, allowedOrigins)

    /** Builds a plain-text response, adding CORS headers for allowed origins. */
    const respond = (
      body: string | null,
      status: number,
      extraHeaders: Record<string, string> = {},
    ): Response =>
      new Response(body, {
        status,
        headers: {
          ...(originAllowed ? corsHeaders(origin!) : {}),
          ...extraHeaders,
        },
      })

    if (request.method === 'OPTIONS') {
      if (!originAllowed) {
        return respond('Forbidden', 403)
      }
      return respond(null, 204)
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return respond('Method Not Allowed', 405, { Allow: ALLOWED_METHODS })
    }

    if (!originAllowed) {
      return respond('Forbidden origin', 403)
    }

    const requestUrl = new URL(request.url)
    const targetUrlStr = requestUrl.searchParams.get('url')

    if (!targetUrlStr) {
      return respond('Missing ?url= parameter', 400)
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(targetUrlStr)
    } catch {
      return respond('Invalid URL', 400)
    }

    if (!isTargetAllowed(targetUrl, allowedTargetDomains)) {
      return respond('Target domain not allowed', 403)
    }

    const isHead = request.method === 'HEAD'

    try {
      const response = await fetchImpl(targetUrl.toString(), {
        method: request.method,
        headers: {
          'User-Agent': request.headers.get('User-Agent') || '',
        },
        cf: {
          cacheTtl,
          cacheEverything: true,
        },
      })

      if (!response.ok) {
        return respond(
          isHead ? null : `Upstream error: ${response.status}`,
          response.status,
        )
      }

      const headers = new Headers({
        ...corsHeaders(origin!),
        'Content-Type':
          response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': `public, max-age=${cacheTtl}`,
      })

      const contentLength = response.headers.get('Content-Length')
      if (contentLength) {
        headers.set('Content-Length', contentLength)
      }

      return new Response(isHead ? null : response.body, {
        status: 200,
        headers,
      })
    } catch (err) {
      return respond(
        isHead ? null : `Fetch failed: ${(err as Error).message}`,
        502,
      )
    }
  }
}
