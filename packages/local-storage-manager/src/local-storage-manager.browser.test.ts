import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageManager } from './local-storage-manager'

describe('LocalStorageManager (browser)', () => {
  const TEST_KEY = 'test-storage-key'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('save', () => {
    it('문자열 값을 저장', () => {
      const storage = new LocalStorageManager<string>(TEST_KEY)

      storage.save('hello')

      expect(localStorage.getItem(TEST_KEY)).toBe('"hello"')
    })

    it('객체를 JSON으로 저장', () => {
      const storage = new LocalStorageManager<{ name: string; age: number }>(TEST_KEY)

      storage.save({ name: 'John', age: 30 })

      expect(localStorage.getItem(TEST_KEY)).toBe('{"name":"John","age":30}')
    })

    it('배열을 JSON으로 저장', () => {
      const storage = new LocalStorageManager<number[]>(TEST_KEY)

      storage.save([1, 2, 3])

      expect(localStorage.getItem(TEST_KEY)).toBe('[1,2,3]')
    })
  })

  describe('load', () => {
    it('저장된 값을 불러옴', () => {
      const storage = new LocalStorageManager<string>(TEST_KEY)
      localStorage.setItem(TEST_KEY, '"saved-value"')

      const result = storage.load()

      expect(result).toBe('saved-value')
    })

    it('저장된 객체를 파싱하여 반환', () => {
      const storage = new LocalStorageManager<{ id: number; active: boolean }>(TEST_KEY)
      localStorage.setItem(TEST_KEY, '{"id":1,"active":true}')

      const result = storage.load()

      expect(result).toEqual({ id: 1, active: true })
    })

    it('값이 없으면 null 반환', () => {
      const storage = new LocalStorageManager<string>(TEST_KEY)

      const result = storage.load()

      expect(result).toBeNull()
    })
  })

  describe('remove', () => {
    it('저장된 값을 제거', () => {
      const storage = new LocalStorageManager<string>(TEST_KEY)
      localStorage.setItem(TEST_KEY, '"to-be-removed"')

      storage.remove()

      expect(localStorage.getItem(TEST_KEY)).toBeNull()
    })
  })

  describe('통합 시나리오', () => {
    it('저장, 불러오기, 제거 전체 흐름', () => {
      type User = { id: string; name: string }
      const storage = new LocalStorageManager<User>(TEST_KEY)

      expect(storage.load()).toBeNull()

      storage.save({ id: '123', name: 'Alice' })
      expect(storage.load()).toEqual({ id: '123', name: 'Alice' })

      storage.save({ id: '123', name: 'Alice Updated' })
      expect(storage.load()).toEqual({ id: '123', name: 'Alice Updated' })

      storage.remove()
      expect(storage.load()).toBeNull()
    })

    it('서로 다른 키는 독립적으로 동작', () => {
      const storage1 = new LocalStorageManager<string>('key-1')
      const storage2 = new LocalStorageManager<string>('key-2')

      storage1.save('value-1')
      storage2.save('value-2')

      expect(storage1.load()).toBe('value-1')
      expect(storage2.load()).toBe('value-2')

      storage1.remove()
      expect(storage1.load()).toBeNull()
      expect(storage2.load()).toBe('value-2')

      localStorage.clear()
    })
  })
})
