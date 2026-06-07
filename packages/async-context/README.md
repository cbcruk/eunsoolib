# @eunsoolib/async-context

Node.js `AsyncLocalStorage` 기반의 타입 안전한 컨텍스트 관리 라이브러리입니다.

**Props drilling 없이** 비동기 실행 컨텍스트 내에서 데이터를 공유할 수 있습니다. React Context와 유사하지만 서버 사이드(Node.js)에서 동작합니다.

## 설치

```bash
pnpm add @eunsoolib/async-context
```

## 핵심 컨셉

```
┌─────────────────────────────────────────────────────────────┐
│  userContext.run({ id: "123" }, async () => {              │
│    ┌─────────────────────────────────────────────────────┐ │
│    │  getProfile()                                       │ │
│    │    └─ userContext.get() → { id: "123" }            │ │
│    │       └─ getAppointments()                         │ │
│    │          └─ userContext.get() → { id: "123" }      │ │
│    │             └─ getNotifications()                  │ │
│    │                └─ userContext.get() → { id: "123" }│ │
│    └─────────────────────────────────────────────────────┘ │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
```

## 기본 사용법

### 1. 컨텍스트 생성

```typescript
import { createAsyncContext } from '@eunsoolib/async-context'

interface User {
  id: string
  name: string
  role: 'admin' | 'user'
}

// 컨텍스트 생성
const userContext = createAsyncContext<User>({
  name: 'user',
  errorMessage: '인증된 사용자를 찾을 수 없습니다.',
})
```

### 2. 컨텍스트 사용

```typescript
// 서비스 함수 - props drilling 없음!
async function getProfile() {
  const user = userContext.get() // 어디서든 접근 가능
  return {
    ...user,
    appointments: await getAppointments(),
  }
}

async function getAppointments() {
  const user = userContext.get() // 여기서도 접근 가능
  return db.query('SELECT * FROM appointments WHERE user_id = $1', [user.id])
}

// Route Handler에서 컨텍스트 설정
export async function GET(request: Request) {
  const user = await authenticate(request)

  const profile = await userContext.run(user, async () => {
    return getProfile() // 내부 함수들이 자동으로 user에 접근
  })

  return Response.json(profile)
}
```

## API Reference

### `createAsyncContext<T>(options?)`

새로운 컨텍스트를 생성합니다.

```typescript
const ctx = createAsyncContext<string>({
  name: 'contextName', // 에러 메시지에서 사용
  defaultValue: 'default', // 기본값 (선택)
  errorMessage: '커스텀 에러 메시지', // 선택
})
```

**반환 객체:**

| 메서드                 | 설명                            |
| ---------------------- | ------------------------------- |
| `run(value, callback)` | 값을 설정하고 콜백 실행         |
| `get()`                | 현재 값 반환 (없으면 에러)      |
| `getOptional()`        | 현재 값 반환 (없으면 undefined) |
| `isActive()`           | 컨텍스트 활성 여부              |

### `composeContexts(contexts, values, callback)`

여러 컨텍스트를 동시에 설정합니다.

```typescript
const result = await composeContexts(
  { user: userContext, db: dbContext },
  { user: currentUser, db: dbConnection },
  async () => {
    // 두 컨텍스트 모두 접근 가능
    return handleRequest()
  },
)
```

### `getContextValues(contexts)`

여러 컨텍스트의 값을 한 번에 가져옵니다.

```typescript
const { user, db } = getContextValues({
  user: userContext,
  db: dbContext,
})
```

## Next.js Route Handler 통합

### 단일 컨텍스트 래퍼

```typescript
import { createRouteWrapper } from '@eunsoolib/async-context'

const withAuth = createRouteWrapper(userContext, async (request) => {
  return await authenticate(request)
})

// route.ts
export const GET = withAuth(async () => {
  const user = userContext.get()
  return Response.json({ user })
})
```

### 다중 컨텍스트 래퍼

```typescript
import { createMultiRouteWrapper } from '@eunsoolib/async-context'

const withContext = createMultiRouteWrapper({
  user: {
    context: userContext,
    setup: (req) => authenticate(req),
  },
  db: {
    context: dbContext,
    setup: () => getDbConnection(),
  },
  logger: {
    context: loggerContext,
    setup: () => createLogger(),
  },
})

export const GET = withContext(async () => {
  const user = userContext.get()
  const db = dbContext.get()
  const logger = loggerContext.get()

  logger.info('Fetching profile', { userId: user.id })
  return Response.json(await db.getProfile(user.id))
})
```

## 미들웨어 패턴

Express/Koa 스타일의 미들웨어 체인을 구성할 수 있습니다.

```typescript
import {
  createContextMiddleware,
  runWithMiddlewares,
} from '@eunsoolib/async-context'

// 미들웨어 정의
const requestMiddleware = createContextMiddleware(requestContext, (req) => ({
  id: crypto.randomUUID(),
  startTime: Date.now(),
}))

const authMiddleware = createContextMiddleware(userContext, async (req) => {
  const token = req.headers.get('authorization')
  return await validateToken(token)
})

// 미들웨어 체인 실행
const result = await runWithMiddlewares(
  request,
  [requestMiddleware, authMiddleware],
  async () => handleRequest(),
)
```

## 디버깅

```typescript
import { debugContexts } from '@eunsoolib/async-context'

const status = debugContexts({
  user: userContext,
  db: dbContext,
})

console.log(status)
// {
//   user: { active: true, value: { id: "123", ... } },
//   db: { active: false, value: undefined }
// }
```

## 실제 사용 예제: 의료 예약 시스템

```typescript
// contexts.ts
export const userContext = createAsyncContext<User>({ name: 'user' })
export const dbContext = createAsyncContext<DbConnection>({ name: 'db' })

// services/appointment.ts
export async function createAppointment(data: AppointmentInput) {
  const user = userContext.get()
  const db = dbContext.get()

  return db.transaction(async (trx) => {
    const appointment = await trx.insert('appointments', {
      ...data,
      patientId: user.id,
    })

    // 중첩 함수에서도 컨텍스트 접근 가능
    await notifyDoctor(data.doctorId, appointment)

    return appointment
  })
}

async function notifyDoctor(doctorId: string, appointment: Appointment) {
  const user = userContext.get() // 여전히 접근 가능
  const db = dbContext.get()

  await db.insert('notifications', {
    userId: doctorId,
    message: `새 예약: ${user.name}님`,
  })
}

// route.ts
const withContext = createMultiRouteWrapper({
  user: { context: userContext, setup: authenticate },
  db: { context: dbContext, setup: getDbConnection },
})

export const POST = withContext(async (req) => {
  const body = await req.json()
  const appointment = await createAppointment(body)
  return Response.json(appointment)
})
```

## 주의사항

1. **Node.js 전용**: 브라우저에서는 동작하지 않습니다.
2. **실행 컨텍스트 기반**: `run()` 블록 외부에서는 값에 접근할 수 없습니다.
3. **동시성 안전**: 각 요청은 독립된 컨텍스트를 가집니다.

## 영감

- [Nico's Blog - Use Async Local Storage to prevent props drilling](https://www.nico.fyi/blog/async-local-storage-to-prevent-props-drilling)
- React Context API
- Express/Koa 미들웨어 패턴

## 라이선스

MIT
