type Status = unknown

type Key = string

type Value = {
  id: Key
  status: Status
}

class StatusStore {
  private map: Map<Key, Value>
  private storage: LocalStorageManager<[Key, Value][]>

  constructor(name: string) {
    this.storage = new LocalStorageManager(name)
    const stored = this.storage.load()
    this.map = new Map(stored ?? [])
  }

  set(key: Key, status: Status) {
    this.map.set(key, {
      id: key,
      status,
    })
    this.save()
  }

  get(key: Key) {
    return this.map.get(key)
  }

  delete(key: Key) {
    const result = this.map.delete(key)
    this.save()
    return result
  }

  clear() {
    this.map.clear()
    this.storage.remove()
  }

  getAll() {
    return [...this.map.entries()]
  }

  private save() {
    this.storage.save([...this.map.entries()])
  }
}
