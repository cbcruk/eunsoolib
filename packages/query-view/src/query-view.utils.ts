import type { ReactNode } from 'react'
import type { QueryLike } from './types'

const noop = (): void => {}

/**
 * production 빌드가 아닌지.
 *
 * `process.env.NODE_ENV`를 직접 참조하면 소비자 tsconfig가 `@types/node`를
 * 요구하게 되므로 `globalThis`를 거쳐 읽는다. 번들러의 문자열 치환 대상에서
 * 벗어나는 대신, 그래서 제거되지 않는 건 개발용 경고 블록 하나뿐이다.
 */
export const isDev: boolean =
  (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV !== 'production'

/**
 * 값 슬롯과 함수 슬롯을 같은 자리에서 받는다.
 *
 * `ReactNode`에는 함수가 포함되지 않으므로 `typeof slot === 'function'` 하나로
 * 두 형태를 안전하게 가른다.
 *
 * @param slot - 노드이거나, 인자를 받아 노드를 만드는 함수.
 * @param args - 함수 슬롯일 때 넘길 인자.
 * @returns 렌더할 노드.
 */
export function renderSlot<A extends unknown[]>(
  slot: ReactNode | ((...args: A) => ReactNode),
  ...args: A
): ReactNode {
  return typeof slot === 'function'
    ? (slot as (...args: A) => ReactNode)(...args)
    : slot
}

/**
 * 슬롯에 넘길 재시도 함수를 고른다.
 *
 * `onRetry`가 있으면 그것을, 없으면 `query.refetch`를 쓴다. 둘 다 없으면 no-op을
 * 돌려준다 — 슬롯이 `retry`의 존재를 확인할 필요가 없도록, 이 자리는 항상 호출
 * 가능한 함수다.
 *
 * @param query - 재요청 대상 query.
 * @param onRetry - 직접 넘긴 재시도 동작. 캐시 무효화가 필요할 때 쓴다.
 * @returns 슬롯에 넘길 재시도 함수.
 */
export function resolveRetry<T>(
  query: QueryLike<T>,
  onRetry?: () => void,
): () => void {
  if (onRetry) return onRetry
  if (!query.refetch) return noop

  return () => void query.refetch?.()
}
