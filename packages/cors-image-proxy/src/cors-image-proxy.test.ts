import { describe, expect, test, vi } from 'vitest'
import { corsImageProxy } from './cors-image-proxy'
import type { FetchLike } from './cors-image-proxy.types'

const OPTIONS = {
  allowedOrigins: ['http://localhost:3000', '*.vercel.app'],
  allowedTargetDomains: ['s3.amazonaws.com', 'your-cdn.cloudfront.net'],
}

function makeRequest(
  url: string,
  init: { method?: string; origin?: string | null } = {},
): Request {
  const headers = new Headers()
  if (init.origin) headers.set('Origin', init.origin)
  return new Request(url, { method: init.method ?? 'GET', headers })
}

function okFetch(
  body = 'image-bytes',
  headers: Record<string, string> = { 'Content-Type': 'image/png' },
): FetchLike {
  return vi.fn(async () => new Response(body, { status: 200, headers }))
}

describe('corsImageProxy', () => {
  test('preflight 요청에 허용된 origin이면 204와 CORS 헤더를 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/', {
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    )
  })

  test('preflight 요청에 허용되지 않은 origin이면 403을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/', {
        method: 'OPTIONS',
        origin: 'https://evil.com',
      }),
    )

    expect(res.status).toBe(403)
  })

  test('GET이 아닌 메서드는 405를 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/', {
        method: 'POST',
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(405)
  })

  test('허용되지 않은 origin의 GET은 403을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'https://evil.com',
      }),
    )

    expect(res.status).toBe(403)
  })

  test('Origin 헤더가 없으면 403을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png'),
    )

    expect(res.status).toBe(403)
  })

  test('url 파라미터가 없으면 400을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/', { origin: 'http://localhost:3000' }),
    )

    expect(res.status).toBe(400)
  })

  test('잘못된 url이면 400을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/?url=not-a-url', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(400)
  })

  test('허용되지 않은 대상 도메인이면 403을 반환한다', async () => {
    const handler = corsImageProxy(OPTIONS)
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://evil.com/a.png', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(403)
  })

  test('정상 요청은 200과 함께 이미지를 프록시한다', async () => {
    const fetchImpl = okFetch()
    const handler = corsImageProxy({ ...OPTIONS, fetch: fetchImpl })
    const res = await handler(
      makeRequest(
        'https://proxy.test/?url=https://s3.amazonaws.com/bucket/a.png',
        { origin: 'http://localhost:3000' },
      ),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    )
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/bucket/a.png',
      expect.anything(),
    )
    expect(await res.text()).toBe('image-bytes')
  })

  test('서브도메인 와일드카드 origin을 허용한다', async () => {
    const handler = corsImageProxy({ ...OPTIONS, fetch: okFetch() })
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'https://my-app.vercel.app',
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://my-app.vercel.app',
    )
  })

  test('cacheTtl 옵션이 Cache-Control에 반영된다', async () => {
    const handler = corsImageProxy({
      ...OPTIONS,
      cacheTtl: 60,
      fetch: okFetch(),
    })
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  test('Content-Type이 없으면 octet-stream으로 대체한다', async () => {
    const handler = corsImageProxy({
      ...OPTIONS,
      fetch: vi.fn(async () => new Response(null, { status: 200 })),
    })
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  test('upstream 오류 상태를 그대로 전파한다', async () => {
    const handler = corsImageProxy({
      ...OPTIONS,
      fetch: vi.fn(async () => new Response('nope', { status: 404 })),
    })
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(404)
  })

  test('fetch가 실패하면 502를 반환한다', async () => {
    const handler = corsImageProxy({
      ...OPTIONS,
      fetch: vi.fn(async () => {
        throw new Error('network down')
      }),
    })
    const res = await handler(
      makeRequest('https://proxy.test/?url=https://s3.amazonaws.com/a.png', {
        origin: 'http://localhost:3000',
      }),
    )

    expect(res.status).toBe(502)
    expect(await res.text()).toContain('network down')
  })
})
