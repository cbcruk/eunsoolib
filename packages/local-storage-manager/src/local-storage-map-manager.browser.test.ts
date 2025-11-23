import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageMapManager } from './local-storage-map-manager'

describe('LocalStorageMapManager (browser)', () => {
  const TEST_KEY = 'test-map-storage'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('set/get', () => {
    it('값을 저장하고 조회', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)

      store.set('a', 1)

      expect(store.get('a')).toBe(1)
    })

    it('객체 값을 저장하고 조회', () => {
      type User = { id: string; name: string }
      const store = new LocalStorageMapManager<string, User>(TEST_KEY)

      store.set('user1', { id: '1', name: 'Alice' })

      expect(store.get('user1')).toEqual({ id: '1', name: 'Alice' })
    })

    it('존재하지 않는 키는 undefined 반환', () => {
      const store = new LocalStorageMapManager<string, string>(TEST_KEY)

      expect(store.get('nonexistent')).toBeUndefined()
    })

    it('set은 chaining 가능', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)

      store.set('a', 1).set('b', 2).set('c', 3)

      expect(store.size).toBe(3)
    })
  })

  describe('has', () => {
    it('키가 존재하면 true 반환', () => {
      const store = new LocalStorageMapManager<string, string>(TEST_KEY)
      store.set('key', 'value')

      expect(store.has('key')).toBe(true)
    })

    it('키가 없으면 false 반환', () => {
      const store = new LocalStorageMapManager<string, string>(TEST_KEY)

      expect(store.has('key')).toBe(false)
    })
  })

  describe('delete', () => {
    it('키를 삭제하고 true 반환', () => {
      const store = new LocalStorageMapManager<string, string>(TEST_KEY)
      store.set('key', 'value')

      const result = store.delete('key')

      expect(result).toBe(true)
      expect(store.get('key')).toBeUndefined()
    })

    it('존재하지 않는 키 삭제 시 false 반환', () => {
      const store = new LocalStorageMapManager<string, string>(TEST_KEY)

      const result = store.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    it('모든 데이터를 삭제', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)
      store.set('a', 1).set('b', 2).set('c', 3)

      store.clear()

      expect(store.size).toBe(0)
      expect(localStorage.getItem(TEST_KEY)).toBeNull()
    })
  })

  describe('size', () => {
    it('저장된 항목 수를 반환', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)

      store.set('a', 1).set('b', 2)

      expect(store.size).toBe(2)
    })
  })

  describe('iteration', () => {
    it('keys()로 모든 키 조회', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)
      store.set('a', 1).set('b', 2)

      expect([...store.keys()]).toEqual(['a', 'b'])
    })

    it('values()로 모든 값 조회', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)
      store.set('a', 1).set('b', 2)

      expect([...store.values()]).toEqual([1, 2])
    })

    it('entries()로 모든 [키, 값] 쌍 조회', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)
      store.set('a', 1).set('b', 2)

      expect([...store.entries()]).toEqual([
        ['a', 1],
        ['b', 2],
      ])
    })

    it('toArray()로 배열 변환', () => {
      const store = new LocalStorageMapManager<string, number>(TEST_KEY)
      store.set('a', 1).set('b', 2)

      expect(store.toArray()).toEqual([
        ['a', 1],
        ['b', 2],
      ])
    })
  })

  describe('persistence', () => {
    it('새 인스턴스 생성 시 localStorage에서 데이터 복원', () => {
      const store1 = new LocalStorageMapManager<string, number>(TEST_KEY)
      store1.set('a', 1).set('b', 2)

      const store2 = new LocalStorageMapManager<string, number>(TEST_KEY)

      expect(store2.get('a')).toBe(1)
      expect(store2.get('b')).toBe(2)
      expect(store2.size).toBe(2)
    })

    it('delete 후 새 인스턴스에서도 삭제 상태 유지', () => {
      const store1 = new LocalStorageMapManager<string, number>(TEST_KEY)
      store1.set('a', 1).set('b', 2)
      store1.delete('a')

      const store2 = new LocalStorageMapManager<string, number>(TEST_KEY)

      expect(store2.has('a')).toBe(false)
      expect(store2.get('b')).toBe(2)
    })

    it('서로 다른 키는 독립적으로 동작', () => {
      const store1 = new LocalStorageMapManager<string, string>('store-1')
      const store2 = new LocalStorageMapManager<string, string>('store-2')

      store1.set('key', 'value-1')
      store2.set('key', 'value-2')

      expect(store1.get('key')).toBe('value-1')
      expect(store2.get('key')).toBe('value-2')

      localStorage.clear()
    })
  })
})
