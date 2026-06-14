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

    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(origin, allowedOrigins)) {
        return new Response('Forbidden', { status: 403 })
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin!) })
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    if (!isOriginAllowed(origin, allowedOrigins)) {
      return new Response('Forbidden origin', { status: 403 })
    }

    const requestUrl = new URL(request.url)
    const targetUrlStr = requestUrl.searchParams.get('url')

    if (!targetUrlStr) {
      return new Response('Missing ?url= parameter', { status: 400 })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(targetUrlStr)
    } catch {
      return new Response('Invalid URL', { status: 400 })
    }

    if (!isTargetAllowed(targetUrl, allowedTargetDomains)) {
      return new Response('Target domain not allowed', { status: 403 })
    }

    try {
      const response = await fetchImpl(targetUrl.toString(), {
        headers: {
          'User-Agent': request.headers.get('User-Agent') || '',
        },
        cf: {
          cacheTtl,
          cacheEverything: true,
        },
      })

      if (!response.ok) {
        return new Response(`Upstream error: ${response.status}`, {
          status: response.status,
        })
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

      return new Response(response.body, { status: 200, headers })
    } catch (err) {
      return new Response(`Fetch failed: ${(err as Error).message}`, {
        status: 502,
      })
    }
  }
}
