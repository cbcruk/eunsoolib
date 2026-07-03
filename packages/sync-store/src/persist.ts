import { createStore, type Store } from './create-store'

/**
 * `persist`가 사용하는 저장소 인터페이스. `localStorage` / `sessionStorage`와 호환.
 */
export interface PersistStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export interface PersistOptions<T, P = T> {
  /** 저장 키 */
  name: string
  /** 사용할 저장소. 기본값은 `localStorage`이며, 접근 불가 시(SSR 등) persist는 no-op가 된다. */
  storage?: PersistStorage
  /** 저장할 부분만 선택한다. 기본값은 상태 전체. */
  partialize?: (state: T) => P
  /** 하이드레이트 시 저장된 값과 초기 상태를 병합하는 방식. 기본값은 shallow merge. */
  merge?: (persisted: P, current: T) => T
  /** 스키마 버전. 저장된 버전과 다르면 `migrate`가 없을 경우 저장분을 폐기한다. */
  version?: number
  /** 버전 불일치 시 마이그레이션. */
  migrate?: (persisted: unknown, from: number) => P
}

interface PersistedPayload {
  version: number
  state: unknown
}

function getDefaultStorage(): PersistStorage | undefined {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    // SSR, privacy 모드 등에서 접근 자체가 throw할 수 있다.
  }

  return undefined
}

/**
 * `createStore` 위에 localStorage 등 영속화를 얹은 싱글턴 store를 만든다.
 *
 * - 생성 시 저장된 값을 읽어 초기 상태에 병합(하이드레이트)한다.
 * - 상태가 바뀔 때마다 `partialize`한 결과를 저장하되,
 *   직렬화 결과가 이전과 같으면 쓰기를 건너뛴다(불필요한 I/O 방지).
 *
 * @example
 * ```ts
 * const store = persist(
 *   { volume: 1, isLooping: false, currentTime: 0 },
 *   { name: 'audio', partialize: ({ volume, isLooping }) => ({ volume, isLooping }) },
 * )
 * ```
 */
export function persist<T, P = T>(
  initialState: T,
  options: PersistOptions<T, P>,
): Store<T> {
  const {
    name,
    storage = getDefaultStorage(),
    partialize = (state) => state as unknown as P,
    merge = (persisted, current) =>
      ({ ...current, ...(persisted as object) }) as T,
    version = 0,
    migrate,
  } = options

  const serialize = (state: T) =>
    JSON.stringify({
      version,
      state: partialize(state),
    } satisfies PersistedPayload)

  const hydrate = (): T => {
    if (!storage) {
      return initialState
    }

    try {
      const raw = storage.getItem(name)

      if (!raw) {
        return initialState
      }

      const parsed = JSON.parse(raw) as PersistedPayload
      let persisted = parsed.state as P

      if (parsed.version !== version) {
        if (!migrate) {
          return initialState
        }

        persisted = migrate(parsed.state, parsed.version)
      }

      return merge(persisted, initialState)
    } catch {
      // 파싱 실패 등은 저장분을 무시하고 초기 상태로 시작한다.
      return initialState
    }
  }

  const store = createStore<T>(hydrate())

  if (storage) {
    let lastWritten = serialize(store.getState())

    store.subscribe(() => {
      const next = serialize(store.getState())

      // partialize한 slice가 실제로 바뀌었을 때만 저장한다.
      if (next === lastWritten) {
        return
      }

      lastWritten = next

      try {
        storage.setItem(name, next)
      } catch {
        // quota 초과 등 저장 실패는 무시한다.
      }
    })
  }

  return store
}
