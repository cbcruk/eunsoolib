import { createServer, type Server } from 'node:http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { compileOverride, compileScenario } from './compile'
import type { Override } from './types'

function override(patch: Partial<Override> = {}): Override {
  return {
    id: 'GET https://api.test/users',
    method: 'get',
    path: 'https://api.test/users',
    enabled: true,
    mode: 'json',
    status: 200,
    delay: 0,
    body: null,
    ...patch,
  }
}

describe('compileOverride', () => {
  it('꺼진 오버라이드는 핸들러를 만들지 않아야 함', () => {
    expect(compileOverride(override({ enabled: false }))).toBeNull()
  })

  it('다룰 수 없는 method는 핸들러를 만들지 않아야 함', () => {
    expect(compileOverride(override({ method: 'trace' as never }))).toBeNull()
  })

  it('켜진 오버라이드는 핸들러를 만들어야 함', () => {
    expect(compileOverride(override())).not.toBeNull()
  })
})

describe('compileScenario', () => {
  it('켜진 오버라이드만 핸들러로 만들어야 함', () => {
    const handlers = compileScenario({
      a: override({ id: 'a', enabled: true }),
      b: override({ id: 'b', enabled: false }),
    })

    expect(handlers).toHaveLength(1)
  })

  it('빈 시나리오는 빈 배열이어야 함', () => {
    expect(compileScenario({})).toEqual([])
  })
})

describe('compileScenario로 만든 핸들러의 동작', () => {
  const server = setupServer(
    http.get('https://api.test/users', () =>
      HttpResponse.json([{ id: 1, name: 'original' }]),
    ),
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('json 모드는 status와 body를 그대로 응답해야 함', async () => {
    server.use(
      ...compileScenario({
        a: override({ status: 500, body: { message: 'boom' } }),
      }),
    )

    const response = await fetch('https://api.test/users')

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ message: 'boom' })
  })

  it('body가 없으면 null을 응답해야 함', async () => {
    server.use(...compileScenario({ a: override({ status: 204 }) }))

    const response = await fetch('https://api.test/users')

    expect(response.status).toBe(204)
  })

  it('network-error 모드는 전송 계층에서 실패시켜야 함', async () => {
    server.use(...compileScenario({ a: override({ mode: 'network-error' }) }))

    await expect(fetch('https://api.test/users')).rejects.toThrow()
  })

  it('숫자 delay를 기다린 뒤 응답해야 함', async () => {
    server.use(...compileScenario({ a: override({ delay: 60 }) }))

    const startedAt = Date.now()
    await fetch('https://api.test/users')

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(50)
  })

  it('오버라이드가 등록된 핸들러보다 우선해야 함', async () => {
    server.use(...compileScenario({ a: override({ body: ['overridden'] }) }))

    const response = await fetch('https://api.test/users')

    await expect(response.json()).resolves.toEqual(['overridden'])
  })
})

describe('passthrough 모드', () => {
  let origin = ''
  let real: Server

  const server = setupServer()

  beforeAll(async () => {
    real = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end('from the real server')
    })

    await new Promise<void>((resolve) => real.listen(0, '127.0.0.1', resolve))

    const address = real.address()
    if (address === null || typeof address === 'string') {
      throw new Error('Could not determine the test server port.')
    }
    origin = `http://127.0.0.1:${address.port}`

    server.listen()
  })

  afterAll(async () => {
    server.close()
    await new Promise<void>((resolve, reject) =>
      real.close((error) => (error ? reject(error) : resolve())),
    )
  })

  it('등록된 핸들러를 건너뛰고 실제 서버에 닿아야 함', async () => {
    server.resetHandlers(
      http.get(`${origin}/thing`, () => HttpResponse.text('mocked')),
    )

    await expect(fetch(`${origin}/thing`).then((r) => r.text())).resolves.toBe(
      'mocked',
    )

    server.use(
      ...compileScenario({
        a: override({
          id: `GET ${origin}/thing`,
          path: `${origin}/thing`,
          mode: 'passthrough',
        }),
      }),
    )

    await expect(fetch(`${origin}/thing`).then((r) => r.text())).resolves.toBe(
      'from the real server',
    )
  })
})
