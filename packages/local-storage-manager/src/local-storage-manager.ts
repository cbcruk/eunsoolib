export class LocalStorageManager<T> {
  constructor(private storageKey: string) {}

  load(): T | null {
    const data = localStorage.getItem(this.storageKey)
    return data ? (JSON.parse(data) as T) : null
  }

  save(value: T) {
    localStorage.setItem(this.storageKey, JSON.stringify(value))
  }

  remove() {
    localStorage.removeItem(this.storageKey)
  }
}
