import { createStore } from './create-store'

describe('createStore', () => {
  it('초기 상태를 getState로 반환해야 함', () => {
    const store = createStore({ count: 0 })

    expect(store.getState()).toEqual({ count: 0 })
  })

  it('getInitialState는 상태가 바뀌어도 초기 상태를 반환해야 함', () => {
    const store = createStore({ count: 0 })

    store.setState({ count: 10 })

    expect(store.getInitialState()).toEqual({ count: 0 })
  })

  it('값으로 setState하면 상태가 교체되어야 함', () => {
    const store = createStore({ count: 0 })

    store.setState({ count: 5 })

    expect(store.getState()).toEqual({ count: 5 })
  })

  it('함수형 updater는 이전 상태를 받아야 함', () => {
    const store = createStore({ count: 1 })

    store.setState((prev) => ({ count: prev.count + 1 }))

    expect(store.getState()).toEqual({ count: 2 })
  })

  it('상태가 바뀌면 구독자에게 알려야 함', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()

    store.subscribe(listener)
    store.setState({ count: 1 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('Object.is 기준으로 동일한 값이면 구독자를 호출하지 않아야 함', () => {
    const store = createStore(0)
    const listener = vi.fn()

    store.subscribe(listener)
    store.setState(0)

    expect(listener).not.toHaveBeenCalled()
  })

  it('여러 구독자 모두에게 알려야 함', () => {
    const store = createStore({ count: 0 })
    const a = vi.fn()
    const b = vi.fn()

    store.subscribe(a)
    store.subscribe(b)
    store.setState({ count: 1 })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('구독 해제 후에는 알림을 받지 않아야 함', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.setState({ count: 1 })

    expect(listener).not.toHaveBeenCalled()
  })
})
