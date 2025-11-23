import { LocalStorageManager } from './local-storage-manager'

/**
 * Map 기반 localStorage 관리자
 * @template K - 키 타입
 * @template V - 값 타입
 * @example
 * ```ts
 * const store = new LocalStorageMapManager<string, { id: string; status: string }>('my-store')
 * store.set('key1', { id: 'key1', status: 'active' })
 * store.get('key1') // { id: 'key1', status: 'active' }
 * store.delete('key1')
 * store.clear()
 * ```
 */
export class LocalStorageMapManager<K, V> {
  private map: Map<K, V>
  private storage: LocalStorageManager<[K, V][]>

  constructor(storageKey: string) {
    this.storage = new LocalStorageManager(storageKey)
    const stored = this.storage.load()
    this.map = new Map(stored ?? [])
  }

  /** 값을 저장하고 localStorage에 동기화 */
  set(key: K, value: V): this {
    this.map.set(key, value)
    this.save()
    return this
  }

  /** 키에 해당하는 값을 반환 */
  get(key: K): V | undefined {
    return this.map.get(key)
  }

  /** 키가 존재하는지 확인 */
  has(key: K): boolean {
    return this.map.has(key)
  }

  /** 키에 해당하는 값을 삭제하고 localStorage에 동기화 */
  delete(key: K): boolean {
    const result = this.map.delete(key)
    this.save()
    return result
  }

  /** 모든 데이터를 삭제하고 localStorage에서도 제거 */
  clear(): void {
    this.map.clear()
    this.storage.remove()
  }

  /** 저장된 항목 수를 반환 */
  get size(): number {
    return this.map.size
  }

  /** 모든 키를 반환 */
  keys(): IterableIterator<K> {
    return this.map.keys()
  }

  /** 모든 값을 반환 */
  values(): IterableIterator<V> {
    return this.map.values()
  }

  /** 모든 [키, 값] 쌍을 반환 */
  entries(): IterableIterator<[K, V]> {
    return this.map.entries()
  }

  /** 모든 [키, 값] 쌍을 배열로 반환 */
  toArray(): [K, V][] {
    return [...this.map.entries()]
  }

  private save(): void {
    this.storage.save([...this.map.entries()])
  }
}
