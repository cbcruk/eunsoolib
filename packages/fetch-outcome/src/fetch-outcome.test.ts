// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { HTTP_ERROR_CODES as C } from './codes'
import { fromH2, fromH3 } from './mapping'
import { inspect, codeOf } from './normalize'
import {
  createError,
  installErrorCode,
  adoptErrorCode,
  hasNativeErrorCode,
} from './attach'
import { assessRetry } from './retry'
import { safeFetch, safeText, isOk, isFailure } from './index'
import { toResult } from './neverthrow'

/** undici가 h2 스트림 리셋에서 실제로 던지는 에러 모양. */
const h2StreamError = (name: string) =>
  installErrorCode(
    new Error(`Stream closed with error code NGHTTP2_${name}`),
    'ERR_HTTP2_STREAM_ERROR',
  )

/** undici는 모든 실패를 `TypeError: fetch failed`로 감싸고 원인은 cause에 넣는다. */
const undiciWrap = (cause: Error) => new TypeError('fetch failed', { cause })

const throwing = (err: unknown) => async (): Promise<Response> => {
  throw err
}

describe('fromH2 / fromH3', () => {
  it('h2 숫자 코드를 추상 코드로 매핑해야 함', () => {
    expect(fromH2(0x07)).toBe(C.REQUEST_REJECTED)
    expect(fromH2(0x08)).toBe(C.REQUEST_CANCELLED)
    expect(fromH2(0x02)).toBe(C.INTERNAL_ERROR)
    expect(fromH2(0x01)).toBe(C.PROTOCOL_ERROR)
    expect(fromH2(0x0a)).toBe(C.CONNECT_ERROR)
  })

  it('프로토콜 배관용 코드와 알 수 없는 코드는 STREAM_RESET으로 모아야 함', () => {
    expect(fromH2(0x03)).toBe(C.STREAM_RESET) // FLOW_CONTROL_ERROR
    expect(fromH2(0x99)).toBe(C.STREAM_RESET) // 알 수 없는 코드
    // NO_ERROR에는 대응하는 추상 코드가 없다. 없는 코드를 지어내지 않는다.
    expect(fromH2(0x00)).toBe(C.STREAM_RESET)
  })

  it('h2가 표현하지 못하는 h3의 방향성 코드를 다뤄야 함', () => {
    expect(fromH3(0x010b)).toBe(C.REQUEST_REJECTED)
    expect(fromH3(0x010c)).toBe(C.REQUEST_CANCELLED)
    // 요청 방향의 STOP_SENDING: "업로드 나머지는 받지 않겠다"
    expect(fromH3(0x010c, { direction: 'request' })).toBe(
      C.REQUEST_BODY_REJECTED,
    )
    // 응답 방향의 RESET_STREAM에 매핑되지 않은 코드
    expect(fromH3(0x0107, { direction: 'response' })).toBe(C.RESPONSE_RESET)
  })
})

describe('inspect', () => {
  it('undici의 TypeError → cause 체인에서 코드를 복구해야 함', () => {
    const info = inspect(undiciWrap(h2StreamError('REFUSED_STREAM')))

    expect(info?.code).toBe(C.REQUEST_REJECTED)
    expect(info?.attested).toBe(true)
    expect(info?.via).toBe('message')
    expect(info?.rawCode).toBe(0x07)
    expect(info?.rawName).toBe('REFUSED_STREAM')
  })

  it('node:http2의 rstCode를 구조화된 필드로 읽어야 함', () => {
    const info = inspect({ rstCode: 8 })

    expect(info?.code).toBe(C.REQUEST_CANCELLED)
    expect(info?.via).toBe('field')
    expect(info?.attested).toBe(true)
  })

  it('cause뿐 아니라 AggregateError.errors도 훑어야 함', () => {
    const aggregate = new AggregateError(
      [installErrorCode(new Error('nope'), 'ECONNREFUSED')],
      'all failed',
    )

    expect(codeOf(new TypeError('fetch failed', { cause: aggregate }))).toBe(
      C.CONNECTION_REFUSED,
    )
  })

  it('전송 계층 에러는 절대 attested가 아니어야 함', () => {
    for (const code of [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'UND_ERR_SOCKET',
      'CERT_HAS_EXPIRED',
    ]) {
      const info = inspect(undiciWrap(installErrorCode(new Error(code), code)))

      expect(info?.attested, `${code}는 attested가 아니어야 함`).toBe(false)
    }
  })

  it('undici 8.11의 UND_ERR_INFO 리셋을 attested 아닌 STREAM_RESET으로 읽어야 함', () => {
    // undici 8.11은 헤더 이전 RST_STREAM을 숫자 코드 없이 이 메시지로만 알린다.
    const info = inspect(
      undiciWrap(
        installErrorCode(
          new Error('HTTP/2: stream closed before the response was complete'),
          'UND_ERR_INFO',
        ),
      ),
    )

    expect(info?.code).toBe(C.STREAM_RESET)
    expect(info?.attested).toBe(false)
  })

  it('content-length 불일치를 attested 아닌 STREAM_RESET으로 읽어야 함', () => {
    const info = inspect(
      undiciWrap(
        installErrorCode(
          new Error(
            'Response body length does not match content-length header',
          ),
          'UND_ERR_RES_CONTENT_LENGTH_MISMATCH',
        ),
      ),
    )

    expect(info?.code).toBe(C.STREAM_RESET)
    expect(info?.attested).toBe(false)
  })

  it('undici 8.11의 리셋 신호로는 POST 재시도를 허용하지 않아야 함', () => {
    // 코드를 복구하지 못한 리셋은 REQUEST_REJECTED로 승격되지 않는다.
    const verdict = assessRetry(
      undiciWrap(
        installErrorCode(
          new Error('HTTP/2: stream closed before the response was complete'),
          'UND_ERR_INFO',
        ),
      ),
      'POST',
    )

    expect(verdict.retryability).toBe('unknown')
    expect(verdict.attested).toBe(false)
  })

  it('추측하지 않고 undefined를 반환해야 함', () => {
    expect(inspect(new TypeError('Failed to fetch'))).toBeUndefined() // 브라우저
    expect(inspect(null)).toBeUndefined()
    expect(inspect('nope')).toBeUndefined()
  })

  it('같은 체인에서 전송 계층 추측보다 attested 증거를 골라야 함', () => {
    // undici는 스트림 에러 아래에 소켓 에러를 중첩하기도 한다.
    const error = undiciWrap(
      Object.assign(h2StreamError('REFUSED_STREAM'), {
        cause: installErrorCode(new Error('socket'), 'ECONNRESET'),
      }),
    )

    const info = inspect(error)

    expect(info?.code).toBe(C.REQUEST_REJECTED)
    expect(info?.attested).toBe(true)
  })

  it('플랫폼이 설정한 코드가 이긴다 — 마이그레이션 이음새', () => {
    const error = createError(TypeError, 'stream reset by server', {
      code: C.REQUEST_REJECTED,
    })

    const info = inspect(error)

    expect(info?.via).toBe('platform')
    expect(info?.code).toBe(C.REQUEST_REJECTED)
  })
})

describe('createError / adoptErrorCode', () => {
  it('설치한 .code가 cause와 같은 서술자 의미를 가져야 함', () => {
    const withCause = new Error('x', { cause: 1 })
    const expected = Object.getOwnPropertyDescriptor(withCause, 'cause')!
    const error = createError(TypeError, 'x', { code: 'ERR_X' })

    const got = Object.getOwnPropertyDescriptor(error, 'code')!

    expect(got.enumerable).toBe(expected.enumerable) // false
    expect(got.writable).toBe(expected.writable) // true
    expect(got.configurable).toBe(expected.configurable) // true
  })

  it('키를 생략하면 .code가 없고, undefined로 넘기면 존재해야 함', () => {
    expect('code' in createError(TypeError, 'x')).toBe(false)
    expect('code' in createError(TypeError, 'x', {})).toBe(false)

    const passed = createError(TypeError, 'x', {
      code: undefined,
    }) as TypeError & {
      code?: unknown
    }

    expect('code' in passed).toBe(true)
    expect(passed.code).toBeUndefined()
  })

  it('열거 불가라서 JSON·spread로 새지 않아야 함', () => {
    const error = createError(TypeError, 'x', { code: 'ERR_X' })

    expect(Object.keys(error)).toEqual([])
    expect({ ...error }).toEqual({})
  })

  it('adoptErrorCode는 플랫폼이 넣은 값을 덮어쓰지 않아야 함', () => {
    const error = installErrorCode(new TypeError('x'), 'PLATFORM_SAID_THIS')

    adoptErrorCode(error, 'WE_GUESSED')

    expect((error as TypeError & { code: unknown }).code).toBe(
      'PLATFORM_SAID_THIS',
    )
  })

  it('기능 탐지는 현재 런타임에 정직해야 함', () => {
    // 제안이 표준이 되면 true로 뒤집힌다. 이 테스트는 그 시점을 알리는 카나리아다.
    expect(hasNativeErrorCode).toBe(false)
  })
})

describe('assessRetry', () => {
  it('REFUSED_STREAM은 비멱등 메서드의 재시도를 허용해야 함', () => {
    const verdict = assessRetry(
      undiciWrap(h2StreamError('REFUSED_STREAM')),
      'POST',
    )

    expect(verdict.retryability).toBe('safe')
    expect(verdict.attested).toBe(true)
  })

  it('attested가 아닌 전송 에러는 비멱등 재시도를 절대 허용하지 않아야 함', () => {
    // ECONNRESET이 함정이다. "요청이 죽었다"처럼 보이지만 서버는 이미 커밋했을 수 있다.
    // 여기서 POST를 재생하면 누군가 두 번 결제된다.
    for (const code of [
      'ECONNRESET',
      'UND_ERR_SOCKET',
      'ETIMEDOUT',
      'UND_ERR_BODY_TIMEOUT',
    ]) {
      const verdict = assessRetry(
        undiciWrap(installErrorCode(new Error(code), code)),
        'POST',
      )

      expect(
        verdict.retryability,
        `${code}는 POST 재시도 대상이 아니어야 함`,
      ).not.toBe('safe')
    }
  })

  it('CANCEL은 POST에 unsafe, GET에 safe여야 함', () => {
    const error = undiciWrap(h2StreamError('CANCEL'))

    expect(assessRetry(error, 'POST').retryability).toBe('unsafe')
    expect(assessRetry(error, 'GET').retryability).toBe('safe')
  })

  it('증거가 없으면 POST에 safe가 아니라 unknown이어야 함', () => {
    expect(
      assessRetry(new TypeError('Failed to fetch'), 'POST').retryability,
    ).toBe('unknown')
  })

  it('GOAWAY는 last-stream-id 없이 추측하지 않아야 함', () => {
    const error = undiciWrap(
      installErrorCode(new Error('goaway'), 'ERR_HTTP2_GOAWAY_SESSION'),
    )

    const verdict = assessRetry(error, 'POST')

    expect(verdict.retryability).toBe('unknown')
    expect(verdict.reason).toMatch(/last-stream-id/)
  })

  it('연결 전 실패는 요청이 전송된 적 없으므로 safe여야 함', () => {
    for (const code of ['ECONNREFUSED', 'ENOTFOUND']) {
      const verdict = assessRetry(
        undiciWrap(installErrorCode(new Error(code), code)),
        'POST',
      )

      expect(verdict.retryability, code).toBe('safe')
    }
  })
})

describe('safeFetch', () => {
  it('성공하면 ok 결과를 반환해야 함', async () => {
    const outcome = await safeFetch(
      'https://x/',
      {},
      {
        fetch: async () => new Response('hi', { status: 200 }),
        redactCrossOrigin: false,
      },
    )

    expect(outcome.kind).toBe('ok')
    expect(isOk(outcome)).toBe(true)
    if (outcome.kind === 'ok') {
      expect(await outcome.value.text()).toBe('hi')
    }
  })

  it('attested 리셋을 재시도 판단이 앞에 오는 failed로 표현해야 함', async () => {
    const outcome = await safeFetch(
      'https://x/',
      { method: 'POST' },
      {
        fetch: throwing(undiciWrap(h2StreamError('REFUSED_STREAM'))),
        redactCrossOrigin: false,
      },
    )

    expect(outcome.kind).toBe('failed')
    if (outcome.kind === 'failed') {
      expect(outcome.retry).toBe('safe')
      expect(outcome.attested).toBe(true)
      expect(outcome.code).toBe(C.REQUEST_REJECTED)
      expect(outcome.evidence.via).toBe('message')
    }
  })

  it('복구 불가능한 실패를 throw가 아니라 indeterminate로 표현해야 함', async () => {
    const outcome = await safeFetch(
      'https://x/',
      { method: 'POST' },
      // 브라우저의 불투명한 깔때기
      { fetch: throwing(new TypeError('Failed to fetch')) },
    )

    expect(outcome.kind).toBe('indeterminate')
    expect(isFailure(outcome)).toBe(true)
    if (outcome.kind === 'indeterminate') {
      expect(outcome.retry).toBe('unknown')
    }
  })

  it('교차 출처의 연결 전 코드를 가리고 indeterminate로 낮춰야 함', async () => {
    const outcome = await safeFetch(
      'https://other.example/',
      { method: 'POST' },
      {
        fetch: throwing(
          undiciWrap(
            installErrorCode(new Error('ECONNREFUSED'), 'ECONNREFUSED'),
          ),
        ),
        origin: 'https://self.example',
        redactCrossOrigin: true,
      },
    )

    // 같은 출처였다면 CONNECTION_REFUSED를 담은 failed가 된다. 출처가 다르면
    // 토폴로지 코드와 그것이 정당화했을 'safe' 판단을 함께 거둬들인다.
    expect(outcome.kind).toBe('indeterminate')
    if (outcome.kind === 'indeterminate') {
      expect(outcome.retry).toBe('unknown')
      expect(outcome.reason).toMatch(/redacted/)
    }
  })

  it('같은 출처의 연결 전 코드는 가리지 않아야 함', async () => {
    const outcome = await safeFetch(
      'https://self.example/api',
      { method: 'POST' },
      {
        fetch: throwing(
          undiciWrap(
            installErrorCode(new Error('ECONNREFUSED'), 'ECONNREFUSED'),
          ),
        ),
        origin: 'https://self.example',
        redactCrossOrigin: true,
      },
    )

    expect(outcome.kind).toBe('failed')
    if (outcome.kind === 'failed') {
      expect(outcome.code).toBe(C.CONNECTION_REFUSED)
    }
  })
})

describe('safeText', () => {
  it('본문 스트림 리셋을 throw가 아니라 결과로 돌려줘야 함', async () => {
    const response = {
      text: async () => {
        throw undiciWrap(h2StreamError('CANCEL'))
      },
    } as unknown as Response

    const outcome = await safeText(response, { method: 'GET' })

    expect(outcome.kind).toBe('failed')
    if (outcome.kind === 'failed') {
      expect(outcome.code).toBe(C.REQUEST_CANCELLED)
    }
  })
})

describe('toResult', () => {
  it('결과를 neverthrow Result로 접어야 함', async () => {
    const okOutcome = await safeFetch(
      'https://x/',
      {},
      { fetch: async () => new Response('hi'), redactCrossOrigin: false },
    )

    expect(toResult(okOutcome).isOk()).toBe(true)

    const failOutcome = await safeFetch(
      'https://x/',
      { method: 'POST' },
      {
        fetch: throwing(new TypeError('Failed to fetch')),
        redactCrossOrigin: false,
      },
    )

    expect(toResult(failOutcome).isErr()).toBe(true)
  })
})
