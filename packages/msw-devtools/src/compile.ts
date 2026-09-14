import { HttpResponse, delay, http, passthrough } from 'msw'
import type { RequestHandler } from 'msw'
import type { Override } from './types'

/**
 * 이 설계의 일방통행 문. 직렬화 가능한 데이터가 들어가면 살아 있는 핸들러가 나온다.
 *
 * 반대 방향은 없다 — resolver는 클로저라 스토리지에 되쓸 수 없다. 그래서 저장하는
 * 건 항상 오버라이드 데이터이고, 핸들러는 변경 때마다 새로 컴파일된다.
 *
 * @param override - 컴파일할 오버라이드.
 * @returns 핸들러. 꺼져 있거나 다룰 수 없는 메서드면 `null`.
 */
export function compileOverride(override: Override): RequestHandler | null {
  if (!override.enabled) return null

  const factory = http[override.method]
  if (typeof factory !== 'function') return null

  return factory(override.path, async () => {
    if (override.delay === 'infinite') {
      await delay('infinite')
    } else if (typeof override.delay === 'number' && override.delay > 0) {
      await delay(override.delay)
    }

    if (override.mode === 'passthrough') return passthrough()
    if (override.mode === 'network-error') return HttpResponse.error()

    return HttpResponse.json(override.body ?? null, { status: override.status })
  })
}

/**
 * 시나리오 하나를 런타임 핸들러 배열로 컴파일한다.
 *
 * 꺼진 오버라이드는 핸들러를 만들지 않으므로 결과에서 빠진다.
 *
 * @param overrides - {@linkcode Scenario.overrides}.
 * @returns `worker.use(...)`에 그대로 넘길 수 있는 핸들러 배열.
 *
 * @example 시나리오를 코드로 적용하기
 * ```ts
 * import { compileScenario } from '@cbcruk/msw-devtools'
 *
 * worker.resetHandlers()
 * worker.use(...compileScenario(scenario.overrides))
 * ```
 */
export function compileScenario(
  overrides: Record<string, Override>,
): RequestHandler[] {
  return Object.values(overrides)
    .map(compileOverride)
    .filter((handler): handler is RequestHandler => handler !== null)
}
