import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persist, type PersistStorage } from './persist'

function createMemoryStorage(): PersistStorage & {
  store: Map<string, string>
} {
  const store = new Map<string, string>()

  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
}

describe('persist', () => {
  let storage: ReturnType<typeof createMemoryStorage>

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('저장된 값이 없으면 초기 상태로 시작한다', () => {
    const store = persist({ count: 0 }, { name: 'app', storage })

    expect(store.getState()).toEqual({ count: 0 })
  })

  it('상태가 바뀌면 저장소에 기록한다', () => {
    const store = persist({ count: 0 }, { name: 'app', storage })

    store.setState({ count: 3 })

    expect(JSON.parse(storage.getItem('app')!)).toEqual({
      version: 0,
      state: { count: 3 },
    })
  })

  it('저장된 값을 읽어 초기 상태에 병합한다(하이드레이트)', () => {
    storage.setItem('app', JSON.stringify({ version: 0, state: { count: 7 } }))

    const store = persist(
      { count: 0, name: 'eunsoo' },
      { name: 'app', storage },
    )

    expect(store.getState()).toEqual({ count: 7, name: 'eunsoo' })
  })

  it('partialize한 부분만 저장한다', () => {
    const store = persist(
      { volume: 1, isLooping: false, currentTime: 0 },
      {
        name: 'audio',
        storage,
        partialize: ({ volume, isLooping }) => ({ volume, isLooping }),
      },
    )

    store.setState((prev) => ({ ...prev, volume: 0.5, currentTime: 30 }))

    expect(JSON.parse(storage.getItem('audio')!).state).toEqual({
      volume: 0.5,
      isLooping: false,
    })
  })

  it('partialize한 slice가 그대로면 저장소에 쓰지 않는다', () => {
    const store = persist(
      { volume: 1, currentTime: 0 },
      {
        name: 'audio',
        storage,
        partialize: ({ volume }) => ({ volume }),
      },
    )
    const setItem = vi.spyOn(storage, 'setItem')

    // volume은 그대로, currentTime만 변경 → 저장 skip
    store.setState((prev) => ({ ...prev, currentTime: 10 }))

    expect(setItem).not.toHaveBeenCalled()
  })

  it('버전이 다르고 migrate가 없으면 저장분을 폐기한다', () => {
    storage.setItem('app', JSON.stringify({ version: 0, state: { count: 99 } }))

    const store = persist({ count: 0 }, { name: 'app', storage, version: 1 })

    expect(store.getState()).toEqual({ count: 0 })
  })

  it('버전이 다르면 migrate로 변환해 병합한다', () => {
    storage.setItem('app', JSON.stringify({ version: 0, state: { cnt: 5 } }))

    const store = persist(
      { count: 0 },
      {
        name: 'app',
        storage,
        version: 1,
        migrate: (persisted) => ({ count: (persisted as { cnt: number }).cnt }),
      },
    )

    expect(store.getState()).toEqual({ count: 5 })
  })

  it('removeItem 없이 getItem·setItem만 구현한 저장소로도 동작한다', () => {
    const map = new Map<string, string>([
      ['app', JSON.stringify({ version: 0, state: { count: 1 } })],
    ])
    const minimalStorage: PersistStorage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value)
      },
    }

    const store = persist(
      { count: 0 },
      { name: 'app', storage: minimalStorage },
    )
    store.setState({ count: 2 })

    expect(JSON.parse(map.get('app')!)).toEqual({
      version: 0,
      state: { count: 2 },
    })
  })

  it('저장된 값이 손상되어도 초기 상태로 안전하게 시작한다', () => {
    storage.setItem('app', '{ not valid json')

    const store = persist({ count: 0 }, { name: 'app', storage })

    expect(store.getState()).toEqual({ count: 0 })
  })
})
