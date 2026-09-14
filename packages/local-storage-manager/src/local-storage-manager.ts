/**
 * 단일 값을 localStorage에 저장/조회하는 관리자
 * @template T - 저장할 데이터 타입
 * @example
 * ```ts
 * import { LocalStorageManager } from '@cbcruk/local-storage-manager'
 *
 * const storage = new LocalStorageManager<{ theme: string }>('settings')
 * storage.save({ theme: 'dark' })
 * storage.load() // { theme: 'dark' }
 * storage.remove()
 * ```
 */
export class LocalStorageManager<T> {
  /**
   * @param storageKey - 값을 JSON으로 직렬화해 저장할 localStorage 키
   */
  constructor(private storageKey: string) {}

  /** localStorage에서 데이터를 불러옴. 없으면 null 반환 */
  load(): T | null {
    const data = localStorage.getItem(this.storageKey)
    return data ? (JSON.parse(data) as T) : null
  }

  /** 데이터를 localStorage에 저장 */
  save(value: T): void {
    localStorage.setItem(this.storageKey, JSON.stringify(value))
  }

  /** localStorage에서 데이터를 삭제 */
  remove(): void {
    localStorage.removeItem(this.storageKey)
  }
}
