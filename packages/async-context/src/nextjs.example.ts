/**
 * Next.js Route Handler에서 AsyncContext 사용 예제
 *
 * 이 예제는 의료 예약 시스템에서 인증된 사용자와 DB 연결을
 * props drilling 없이 여러 함수에서 공유하는 방법을 보여줍니다.
 */

import {
  createAsyncContext,
  createRouteWrapper,
  createMultiRouteWrapper,
  composeContexts,
  getContextValues,
} from './index'

// ============================================================================
// 1. 타입 정의
// ============================================================================

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'patient'
}

interface DbConnection {
  query: <T>(sql: string, params?: unknown[]) => Promise<T>
  transaction: <T>(callback: (trx: DbConnection) => Promise<T>) => Promise<T>
}

interface RequestMeta {
  requestId: string
  startTime: number
  ip: string
}

// ============================================================================
// 2. 컨텍스트 생성
// ============================================================================

export const userContext = createAsyncContext<User>({
  name: 'user',
  errorMessage:
    '인증된 사용자 정보를 찾을 수 없습니다. auth() 미들웨어가 적용되었는지 확인하세요.',
})

export const dbContext = createAsyncContext<DbConnection>({
  name: 'db',
  errorMessage: '데이터베이스 연결을 찾을 수 없습니다.',
})

export const requestMetaContext = createAsyncContext<RequestMeta>({
  name: 'requestMeta',
})

// ============================================================================
// 3. 서비스 함수들 (props drilling 없음!)
// ============================================================================

/**
 * 사용자 프로필 조회
 * userContext와 dbContext에서 필요한 정보를 직접 가져옴
 */
export async function getProfile() {
  const user = userContext.get()
  const db = dbContext.get()

  const profile = await db.query<{ bio: string; avatar: string }>(
    'SELECT bio, avatar FROM profiles WHERE user_id = $1',
    [user.id],
  )

  // 중첩 함수 호출 - 여전히 컨텍스트 접근 가능
  const appointments = await getAppointments()
  const notifications = await getUnreadNotifications()

  return {
    ...user,
    ...profile,
    appointments,
    notifications,
  }
}

/**
 * 예약 목록 조회
 */
export async function getAppointments() {
  const user = userContext.get()
  const db = dbContext.get()
  const meta = requestMetaContext.getOptional() // 선택적 컨텍스트

  console.log(`[${meta?.requestId}] Fetching appointments for user ${user.id}`)

  return db.query<Array<{ id: string; date: string; doctor: string }>>(
    `SELECT id, date, doctor_name as doctor 
     FROM appointments 
     WHERE patient_id = $1 
     ORDER BY date DESC`,
    [user.id],
  )
}

/**
 * 읽지 않은 알림 조회
 */
export async function getUnreadNotifications() {
  const user = userContext.get()
  const db = dbContext.get()

  return db.query<Array<{ id: string; message: string; createdAt: string }>>(
    `SELECT id, message, created_at as "createdAt"
     FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC
     LIMIT 10`,
    [user.id],
  )
}

// ============================================================================
// 4. Route Handler 래퍼 생성
// ============================================================================

// 단일 컨텍스트 래퍼
export const withAuth = createRouteWrapper(userContext, async (request) => {
  // 실제로는 JWT 토큰 검증 등을 수행
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Unauthorized')
  }

  // 예시 사용자 반환
  return {
    id: 'user-123',
    name: '김은수',
    email: 'eunsoo@example.com',
    role: 'doctor' as const,
  }
})

// 다중 컨텍스트 래퍼
export const withContext = createMultiRouteWrapper({
  user: {
    context: userContext,
    setup: async (request) => {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) throw new Error('Unauthorized')
      return {
        id: 'user-123',
        name: '김은수',
        email: 'eunsoo@example.com',
        role: 'doctor' as const,
      }
    },
  },
  db: {
    context: dbContext,
    setup: async () => {
      // 실제로는 DB 연결 풀에서 연결을 가져옴
      return {
        query: async <T>(sql: string, params?: unknown[]) => {
          console.log('Executing query:', sql, params)
          return [] as T
        },
        transaction: async <T>(callback: (trx: DbConnection) => Promise<T>) => {
          // 트랜잭션 로직
          return callback({} as DbConnection)
        },
      }
    },
  },
  requestMeta: {
    context: requestMetaContext,
    setup: async (request) => ({
      requestId: crypto.randomUUID(),
      startTime: Date.now(),
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    }),
  },
})

// ============================================================================
// 5. Route Handler 예제
// ============================================================================

/**
 * GET /api/profile
 * 단일 래퍼 사용 예제
 */
export const GET_simple = withAuth(async () => {
  const user = userContext.get()
  return Response.json({ user })
})

/**
 * GET /api/profile
 * 다중 래퍼 사용 예제
 */
export const GET = withContext(async () => {
  const profile = await getProfile()
  return Response.json(profile)
})

/**
 * POST /api/appointments
 * composeContexts 직접 사용 예제
 */
export async function POST(request: Request) {
  // 인증
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user: User = {
    id: 'user-123',
    name: '김은수',
    email: 'eunsoo@example.com',
    role: 'doctor',
  }

  const db: DbConnection = {
    query: async () => [],
    transaction: async (cb) => cb({} as DbConnection),
  }

  // composeContexts로 여러 컨텍스트 동시 설정
  const result = await composeContexts(
    { user: userContext, db: dbContext },
    { user, db },
    async () => {
      const body = await request.json()
      return createAppointment(body)
    },
  )

  return Response.json(result)
}

async function createAppointment(data: {
  date: string
  doctorId: string
  reason: string
}) {
  const user = userContext.get()
  const db = dbContext.get()

  // 트랜잭션 내에서도 컨텍스트 유지
  return db.transaction(async (trx) => {
    const appointment = await trx.query<{ id: string }>(
      `INSERT INTO appointments (patient_id, doctor_id, date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user.id, data.doctorId, data.date, data.reason],
    )

    // 알림 생성 (컨텍스트 여전히 접근 가능)
    await createNotificationForDoctor(data.doctorId, appointment)

    return appointment
  })
}

async function createNotificationForDoctor(
  doctorId: string,
  appointment: { id: string },
) {
  const user = userContext.get()
  const db = dbContext.get()

  await db.query(
    `INSERT INTO notifications (user_id, message)
     VALUES ($1, $2)`,
    [doctorId, `새 예약이 등록되었습니다. 환자: ${user.name}`],
  )
}

// ============================================================================
// 6. 디버깅 예제
// ============================================================================

import { debugContexts } from './index'

export function logContextStatus() {
  const status = debugContexts({
    user: userContext,
    db: dbContext,
    requestMeta: requestMetaContext,
  })

  console.log('Context Status:', JSON.stringify(status, null, 2))
}
