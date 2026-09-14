import type {
  EndpointInfo,
  HandlerLike,
  HttpMethodName,
  MswTarget,
} from './types'

const HTTP_METHODS = new Set<HttpMethodName>([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
])

function isHttpMethod(value: string): value is HttpMethodName {
  return HTTP_METHODS.has(value as HttpMethodName)
}

/**
 * 앱이 이미 등록해 둔 핸들러를 읽어 엔드포인트 목록을 만든다.
 *
 * 기존 핸들러 코드에 주석도, 래퍼도, 수정도 요구하지 않는 게 이 함수의 존재
 * 이유다. 두 종류는 의도적으로 건너뛴다.
 *
 * - **GraphQL 핸들러** — `info`가 path 대신 operation을 들고 있어 같은 키로 다룰 수 없다.
 * - **RegExp path 핸들러** — 오버라이드를 걸 안정적인 문자열 id가 없다.
 *
 * @param target - `setupWorker()` 또는 `setupServer()` 결과.
 * @returns path 순으로 정렬된 엔드포인트. 같은 `id`는 한 번만 담긴다.
 */
export function introspectEndpoints(target: MswTarget): EndpointInfo[] {
  const found = new Map<string, EndpointInfo>()

  for (const handler of target.listHandlers()) {
    if (typeof handler !== 'object' || handler === null) continue

    const info = (handler as HandlerLike).info
    if (typeof info !== 'object' || info === null) continue

    const { method: rawMethod, path } = info as {
      method?: unknown
      path?: unknown
    }

    const method = String(rawMethod ?? '').toLowerCase()

    if (!isHttpMethod(method)) continue
    if (typeof path !== 'string') continue

    const id = `${method.toUpperCase()} ${path}`
    if (!found.has(id)) found.set(id, { id, method, path })
  }

  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path))
}
