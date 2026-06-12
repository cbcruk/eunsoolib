import { describe, it, expect, vi } from 'vitest'
import {
  createAsyncContext,
  composeContexts,
  getContextValues,
  createContextMiddleware,
  runWithMiddlewares,
  createRouteWrapper,
  debugContexts,
  ContextNotFoundError,
} from './index'

describe('createAsyncContext', () => {
  it('컨텍스트 내에서 값을 저장하고 가져올 수 있어야 함', () => {
    const ctx = createAsyncContext<string>({ name: 'test' })

    const result = ctx.run('hello', () => {
      return ctx.get()
    })

    expect(result).toBe('hello')
  })

  it('중첩 함수에서도 컨텍스트에 접근할 수 있어야 함', () => {
    const ctx = createAsyncContext<number>({ name: 'counter' })

    function inner() {
      return ctx.get() * 2
    }

    const result = ctx.run(21, () => {
      return inner()
    })

    expect(result).toBe(42)
  })

  it('비동기 함수에서도 컨텍스트가 유지되어야 함', async () => {
    const ctx = createAsyncContext<string>({ name: 'async' })

    const result = await ctx.run('async-value', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return ctx.get()
    })

    expect(result).toBe('async-value')
  })

  it('컨텍스트 외부에서 get() 호출 시 에러가 발생해야 함', () => {
    const ctx = createAsyncContext<string>({ name: 'error-test' })

    expect(() => ctx.get()).toThrow(ContextNotFoundError)
    expect(() => ctx.get()).toThrow(/error-test/)
  })

  it('getOptional은 컨텍스트 외부에서 undefined를 반환해야 함', () => {
    const ctx = createAsyncContext<string>({ name: 'optional' })

    expect(ctx.getOptional()).toBeUndefined()

    ctx.run('value', () => {
      expect(ctx.getOptional()).toBe('value')
    })
  })

  it('defaultValue가 있으면 컨텍스트 외부에서도 반환해야 함', () => {
    const ctx = createAsyncContext<string>({
      name: 'default',
      defaultValue: 'fallback',
    })

    expect(ctx.get()).toBe('fallback')

    ctx.run('override', () => {
      expect(ctx.get()).toBe('override')
    })
  })

  it('isActive가 컨텍스트 활성 상태를 올바르게 반환해야 함', () => {
    const ctx = createAsyncContext<string>({ name: 'active' })

    expect(ctx.isActive()).toBe(false)

    ctx.run('value', () => {
      expect(ctx.isActive()).toBe(true)
    })

    expect(ctx.isActive()).toBe(false)
  })

  it('중첩된 run은 내부 값으로 오버라이드해야 함', () => {
    const ctx = createAsyncContext<string>({ name: 'nested' })

    ctx.run('outer', () => {
      expect(ctx.get()).toBe('outer')

      ctx.run('inner', () => {
        expect(ctx.get()).toBe('inner')
      })

      expect(ctx.get()).toBe('outer')
    })
  })
})

describe('composeContexts', () => {
  it('여러 컨텍스트를 동시에 설정할 수 있어야 함', () => {
    const userCtx = createAsyncContext<{ name: string }>({ name: 'user' })
    const configCtx = createAsyncContext<{ theme: string }>({ name: 'config' })

    const result = composeContexts(
      { user: userCtx, config: configCtx },
      { user: { name: 'Alice' }, config: { theme: 'dark' } },
      () => {
        return {
          userName: userCtx.get().name,
          theme: configCtx.get().theme,
        }
      },
    )

    expect(result).toEqual({ userName: 'Alice', theme: 'dark' })
  })

  it('빈 컨텍스트 맵도 처리할 수 있어야 함', () => {
    const result = composeContexts({}, {}, () => 'success')
    expect(result).toBe('success')
  })
})

describe('getContextValues', () => {
  it('여러 컨텍스트의 값을 한 번에 가져올 수 있어야 함', () => {
    const aCtx = createAsyncContext<number>({ name: 'a' })
    const bCtx = createAsyncContext<string>({ name: 'b' })

    composeContexts({ a: aCtx, b: bCtx }, { a: 42, b: 'hello' }, () => {
      const values = getContextValues({ a: aCtx, b: bCtx })
      expect(values).toEqual({ a: 42, b: 'hello' })
    })
  })
})

describe('createContextMiddleware & runWithMiddlewares', () => {
  it('미들웨어 체인이 순서대로 실행되어야 함', async () => {
    const logCtx = createAsyncContext<string[]>({ name: 'log' })
    const order: string[] = []

    const middleware1 = createContextMiddleware(logCtx, () => {
      order.push('m1-setup')
      return ['log']
    })

    const middleware2 = createContextMiddleware(
      createAsyncContext<number>({ name: 'num' }),
      () => {
        order.push('m2-setup')
        logCtx.get().push('from-m2')
        return 123
      },
    )

    await runWithMiddlewares(null, [middleware1, middleware2], async () => {
      order.push('handler')
      return 'result'
    })

    expect(order).toEqual(['m1-setup', 'm2-setup', 'handler'])
  })

  it('미들웨어에서 에러가 발생하면 체인이 중단되어야 함', async () => {
    const ctx = createAsyncContext<string>({ name: 'test' })

    const failingMiddleware = createContextMiddleware(ctx, () => {
      throw new Error('Auth failed')
    })

    await expect(
      runWithMiddlewares(null, [failingMiddleware], async () => 'success'),
    ).rejects.toThrow('Auth failed')
  })

  it('비동기 setup도 지원해야 함', async () => {
    const ctx = createAsyncContext<string>({ name: 'async' })

    const asyncMiddleware = createContextMiddleware(ctx, async () => {
      await new Promise((r) => setTimeout(r, 10))
      return 'async-value'
    })

    const result = await runWithMiddlewares(null, [asyncMiddleware], async () =>
      ctx.get(),
    )

    expect(result).toBe('async-value')
  })
})

describe('createRouteWrapper', () => {
  it('Next.js Route Handler를 래핑해야 함', async () => {
    const userCtx = createAsyncContext<{ id: string }>({ name: 'user' })

    const withAuth = createRouteWrapper(userCtx, async (request) => {
      const id = request.headers.get('x-user-id') ?? 'anonymous'
      return { id }
    })

    const handler = withAuth(async () => {
      const user = userCtx.get()
      return Response.json({ userId: user.id })
    })

    const request = new Request('http://localhost/api/test', {
      headers: { 'x-user-id': 'user-123' },
    })

    const response = await handler(request)
    const data = await response.json()

    expect(data).toEqual({ userId: 'user-123' })
  })
})

describe('debugContexts', () => {
  it('컨텍스트 상태를 정확히 반환해야 함', () => {
    const activeCtx = createAsyncContext<number>({ name: 'active' })
    const inactiveCtx = createAsyncContext<string>({ name: 'inactive' })

    activeCtx.run(42, () => {
      const status = debugContexts({ active: activeCtx, inactive: inactiveCtx })

      expect(status).toEqual({
        active: { active: true, value: 42 },
        inactive: { active: false, value: undefined },
      })
    })
  })
})

describe('실제 사용 시나리오', () => {
  it('의료 예약 시스템 시나리오', async () => {
    // 컨텍스트 설정
    const userCtx = createAsyncContext<{ id: string; role: string }>({
      name: 'user',
    })
    const dbCtx = createAsyncContext<{
      query: (sql: string) => Promise<unknown[]>
    }>({
      name: 'db',
    })

    // 서비스 함수 (props drilling 없음)
    async function getAppointments() {
      const user = userCtx.get()
      const db = dbCtx.get()
      return db.query(`SELECT * FROM appointments WHERE user_id = '${user.id}'`)
    }

    async function getProfile() {
      const user = userCtx.get()
      const appointments = await getAppointments()
      return { ...user, appointments }
    }

    // 테스트 실행
    const mockDb = {
      query: vi.fn().mockResolvedValue([{ id: 'appt-1' }]),
    }

    const result = await composeContexts(
      { user: userCtx, db: dbCtx },
      { user: { id: 'u-123', role: 'patient' }, db: mockDb },
      async () => getProfile(),
    )

    expect(result).toEqual({
      id: 'u-123',
      role: 'patient',
      appointments: [{ id: 'appt-1' }],
    })
    expect(mockDb.query).toHaveBeenCalled()
  })
})
