import { introspectEndpoints } from './introspect'
import type { HandlerLike, MswTarget } from './types'

function target(handlers: HandlerLike[]): MswTarget {
  return {
    listHandlers: () => handlers,
    use: () => {},
    resetHandlers: () => {},
  }
}

describe('introspectEndpoints', () => {
  it('등록된 핸들러에서 method와 path를 읽어야 함', () => {
    const endpoints = introspectEndpoints(
      target([{ info: { method: 'GET', path: '/users' } }]),
    )

    expect(endpoints).toEqual([
      { id: 'GET /users', method: 'get', path: '/users' },
    ])
  })

  it('id를 `METHOD path` 형태로 만들어야 함', () => {
    const [endpoint] = introspectEndpoints(
      target([{ info: { method: 'post', path: 'https://api.test/orders' } }]),
    )

    expect(endpoint.id).toBe('POST https://api.test/orders')
  })

  it('path 순으로 정렬해야 함', () => {
    const endpoints = introspectEndpoints(
      target([
        { info: { method: 'GET', path: '/zebra' } },
        { info: { method: 'GET', path: '/apple' } },
      ]),
    )

    expect(endpoints.map((e) => e.path)).toEqual(['/apple', '/zebra'])
  })

  it('같은 method + path는 한 번만 담아야 함', () => {
    const endpoints = introspectEndpoints(
      target([
        { info: { method: 'GET', path: '/users' } },
        { info: { method: 'GET', path: '/users' } },
      ]),
    )

    expect(endpoints).toHaveLength(1)
  })

  it('method가 다르면 서로 다른 엔드포인트여야 함', () => {
    const endpoints = introspectEndpoints(
      target([
        { info: { method: 'GET', path: '/users' } },
        { info: { method: 'POST', path: '/users' } },
      ]),
    )

    expect(endpoints.map((e) => e.id)).toEqual(['GET /users', 'POST /users'])
  })

  it('RegExp path 핸들러는 건너뛰어야 함', () => {
    const endpoints = introspectEndpoints(
      target([{ info: { method: 'GET', path: /\/regex\// } }]),
    )

    expect(endpoints).toEqual([])
  })

  it('method가 없는 GraphQL 핸들러는 건너뛰어야 함', () => {
    const endpoints = introspectEndpoints(
      target([{ info: { operationName: 'GetUser' } }]),
    )

    expect(endpoints).toEqual([])
  })

  it('다룰 수 없는 method는 건너뛰어야 함', () => {
    const endpoints = introspectEndpoints(
      target([{ info: { method: 'TRACE', path: '/users' } }]),
    )

    expect(endpoints).toEqual([])
  })

  it('info가 없는 핸들러에서 던지지 않아야 함', () => {
    expect(() => introspectEndpoints(target([{}]))).not.toThrow()
  })
})
