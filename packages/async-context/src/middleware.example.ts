/**
 * 미들웨어 패턴을 사용한 AsyncContext 예제
 *
 * Express/Koa 스타일의 미들웨어 체인을 구성하는 방법을 보여줍니다.
 */

import {
  createAsyncContext,
  createContextMiddleware,
  runWithMiddlewares,
} from './index'

// ============================================================================
// 타입 정의
// ============================================================================

interface User {
  id: string
  name: string
  permissions: string[]
}

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, error?: Error) => void
  child: (meta: Record<string, unknown>) => Logger
}

interface RequestInfo {
  id: string
  path: string
  method: string
  startTime: number
}

// ============================================================================
// 컨텍스트 생성
// ============================================================================

export const userContext = createAsyncContext<User>({ name: 'user' })
export const loggerContext = createAsyncContext<Logger>({ name: 'logger' })
export const requestContext = createAsyncContext<RequestInfo>({
  name: 'request',
})

// ============================================================================
// 미들웨어 정의
// ============================================================================

/**
 * 요청 정보 미들웨어
 * 모든 요청에 고유 ID와 메타 정보를 부여
 */
export const requestMiddleware = createContextMiddleware(
  requestContext,
  (req: Request) => ({
    id: crypto.randomUUID(),
    path: new URL(req.url).pathname,
    method: req.method,
    startTime: Date.now(),
  }),
)

/**
 * 로거 미들웨어
 * 요청별로 격리된 로거 인스턴스 제공
 */
export const loggerMiddleware = createContextMiddleware(
  loggerContext,
  (_req: Request) => {
    // requestContext가 이미 설정되어 있으면 활용
    const reqInfo = requestContext.getOptional()

    const createLogger = (meta: Record<string, unknown> = {}): Logger => ({
      info: (message, additionalMeta) => {
        console.log(
          JSON.stringify({
            level: 'info',
            message,
            requestId: reqInfo?.id,
            ...meta,
            ...additionalMeta,
            timestamp: new Date().toISOString(),
          }),
        )
      },
      error: (message, error) => {
        console.error(
          JSON.stringify({
            level: 'error',
            message,
            requestId: reqInfo?.id,
            error: error?.message,
            stack: error?.stack,
            ...meta,
            timestamp: new Date().toISOString(),
          }),
        )
      },
      child: (childMeta) => createLogger({ ...meta, ...childMeta }),
    })

    return createLogger()
  },
)

/**
 * 인증 미들웨어
 * JWT 토큰 검증 및 사용자 정보 설정
 */
export const authMiddleware = createContextMiddleware(
  userContext,
  async (req: Request) => {
    const logger = loggerContext.getOptional()
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      logger?.error('Missing or invalid authorization header')
      throw new Error('Unauthorized')
    }

    const token = authHeader.slice(7)

    // 실제로는 JWT 검증 로직
    logger?.info('Validating token', { tokenLength: token.length })

    // 예시 사용자
    return {
      id: 'user-456',
      name: '박의사',
      permissions: ['read:patients', 'write:appointments'],
    }
  },
)

// ============================================================================
// 핸들러 함수
// ============================================================================

async function handleAppointmentCreate() {
  const user = userContext.get()
  const logger = loggerContext.get()
  const reqInfo = requestContext.get()

  logger.info('Creating appointment', { userId: user.id })

  // 권한 체크
  if (!user.permissions.includes('write:appointments')) {
    logger.error('Permission denied')
    throw new Error('Forbidden')
  }

  // 비즈니스 로직...
  const appointment = await createAppointmentInDb()

  const duration = Date.now() - reqInfo.startTime
  logger.info('Appointment created', {
    appointmentId: appointment.id,
    duration,
  })

  return appointment
}

async function createAppointmentInDb() {
  // DB 작업 시뮬레이션
  return { id: 'appt-789', status: 'confirmed' }
}

// ============================================================================
// 미들웨어 체인 실행
// ============================================================================

export async function handleRequest(request: Request): Promise<Response> {
  try {
    // 미들웨어 순서가 중요!
    // requestMiddleware → loggerMiddleware → authMiddleware
    // loggerMiddleware에서 requestContext를 참조할 수 있도록 순서 배치
    const result = await runWithMiddlewares(
      request,
      [requestMiddleware, loggerMiddleware, authMiddleware],
      async () => {
        return handleAppointmentCreate()
      },
    )

    return Response.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error'
    const status =
      message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500

    return Response.json({ error: message }, { status })
  }
}

// ============================================================================
// 조건부 미들웨어
// ============================================================================

/**
 * 특정 조건에서만 미들웨어를 적용하는 헬퍼
 */
export function conditionalMiddleware<TInput, TOutput>(
  condition: (input: TInput) => boolean,
  middleware: (input: TInput, next: () => Promise<TOutput>) => Promise<TOutput>,
) {
  return async (
    input: TInput,
    next: () => Promise<TOutput>,
  ): Promise<TOutput> => {
    if (condition(input)) {
      return middleware(input, next)
    }
    return next()
  }
}

// 예: /public/* 경로는 인증 스킵
export const conditionalAuth = conditionalMiddleware(
  (req: Request) => !new URL(req.url).pathname.startsWith('/public'),
  authMiddleware,
)

// ============================================================================
// 사용 예제
// ============================================================================

async function main() {
  // 테스트 요청
  const request = new Request('https://api.example.com/appointments', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token-123',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patientId: 'p-001', date: '2025-01-22' }),
  })

  const response = await handleRequest(request)
  const data = await response.json()

  console.log('\n=== Response ===')
  console.log('Status:', response.status)
  console.log('Body:', JSON.stringify(data, null, 2))
}

// main();
