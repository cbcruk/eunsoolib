import { act, renderHook } from '@testing-library/react'
import { createStore } from './create-store'
import { useStore } from './use-store'

describe('useStore', () => {
  it('selector 없이 전체 상태를 반환해야 함', () => {
    const store = createStore({ count: 0 })

    const { result } = renderHook(() => useStore(store))

    expect(result.current).toEqual({ count: 0 })
  })

  it('store가 바뀌면 컴포넌트가 리렌더되어야 함', () => {
    const store = createStore({ count: 0 })

    const { result } = renderHook(() => useStore(store, (state) => state.count))

    act(() => {
      store.setState({ count: 3 })
    })

    expect(result.current).toBe(3)
  })

  it('selector로 선택한 slice만 반환해야 함', () => {
    const store = createStore({ count: 0, name: 'eunsoo' })

    const { result } = renderHook(() => useStore(store, (state) => state.name))

    expect(result.current).toBe('eunsoo')
  })

  it('선택한 slice가 바뀌지 않으면 리렌더하지 않아야 함', () => {
    const store = createStore({ count: 0, name: 'eunsoo' })
    let renderCount = 0

    renderHook(() => {
      renderCount += 1

      return useStore(store, (state) => state.count)
    })

    expect(renderCount).toBe(1)

    act(() => {
      // count는 그대로고 name만 바뀐다.
      store.setState((prev) => ({ ...prev, name: 'changed' }))
    })

    expect(renderCount).toBe(1)
  })

  it('isEqual로 동등하다고 판단하면 리렌더하지 않아야 함', () => {
    const store = createStore({ items: [1, 2, 3] })
    let renderCount = 0

    renderHook(() => {
      renderCount += 1

      return useStore(
        store,
        (state) => state.items,
        (a, b) => a.length === b.length,
      )
    })

    expect(renderCount).toBe(1)

    act(() => {
      // 길이가 같으므로 isEqual이 동등하다고 판단한다.
      store.setState({ items: [4, 5, 6] })
    })

    expect(renderCount).toBe(1)
  })

  it('여러 컴포넌트가 동일한 싱글턴 store를 공유해야 함', () => {
    const store = createStore({ count: 0 })

    const first = renderHook(() => useStore(store, (state) => state.count))
    const second = renderHook(() => useStore(store, (state) => state.count))

    act(() => {
      store.setState({ count: 7 })
    })

    expect(first.result.current).toBe(7)
    expect(second.result.current).toBe(7)
  })
})
