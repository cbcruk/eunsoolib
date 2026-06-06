type Resolver = () => void

export interface RWLockOptions {
  /**
   * 'write' (default): write-preferring. writer 대기 중이면 새 reader 차단.
   * 'read': read-preferring. writer가 active일 때만 reader 차단 (max concurrency).
   */
  preference?: 'read' | 'write'
}

export class RWLock {
  private readersActive = 0
  private writersWaiting = 0
  private writerActive = false

  /** 대기 중인 reader resolver들의 FIFO queue */
  private readonly readerQueue: Resolver[] = []
  /** 대기 중인 writer resolver들의 FIFO queue */
  private readonly writerQueue: Resolver[] = []

  private readonly preference: 'read' | 'write'

  constructor(options: RWLockOptions = {}) {
    this.preference = options.preference ?? 'write'
  }

  /**
   * read lock을 획득합니다.
   *
   * 다른 reader와는 병렬로 hold 할 수 있지만, writer가 active이거나
   * (write-preferring 모드에서) writer가 대기 중이면 차단됩니다.
   *
   * @returns lock 획득 시 resolve 되는 Promise (즉시 또는 대기 후)
   */
  acquireRead(): Promise<void> {
    const shouldWait =
      this.writerActive ||
      (this.preference === 'write' && this.writersWaiting > 0)

    if (!shouldWait) {
      this.readersActive++
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.readerQueue.push(() => {
        this.readersActive++
        resolve()
      })
    })
  }

  /**
   * read lock을 반환합니다. 마지막 reader가 빠지면 대기 중인 acquirer를 깨웁니다.
   *
   * @throws active reader가 없는데 호출된 경우 (release 불균형)
   */
  releaseRead(): void {
    if (this.readersActive === 0) {
      throw new Error('RWLock: releaseRead() called but no readers are active')
    }
    this.readersActive--
    if (this.readersActive === 0) {
      this.dispatch()
    }
  }

  /**
   * write lock을 획득합니다.
   *
   * writer는 단독으로만 hold 할 수 있어, 활성 reader/writer가 모두 빠질 때까지
   * 대기합니다. 대기 중에는 writersWaiting에 집계되어 write-preferring 스케줄링의
   * 기준이 됩니다.
   *
   * @returns 단독 점유 시 resolve 되는 Promise (즉시 또는 대기 후)
   */
  acquireWrite(): Promise<void> {
    if (!this.writerActive && this.readersActive === 0) {
      this.writerActive = true
      return Promise.resolve()
    }

    this.writersWaiting++
    return new Promise<void>((resolve) => {
      this.writerQueue.push(() => {
        this.writersWaiting--
        this.writerActive = true
        resolve()
      })
    })
  }

  /**
   * write lock을 반환하고 대기 중인 acquirer를 깨웁니다.
   *
   * @throws active writer가 없는데 호출된 경우 (release 불균형)
   */
  releaseWrite(): void {
    if (!this.writerActive) {
      throw new Error('RWLock: releaseWrite() called but no writer is active')
    }
    this.writerActive = false
    this.dispatch()
  }

  /**
   * lock이 비는 시점에 다음 acquirer를 깨우는 스케줄러.
   *
   * preference에 따라 우선순위가 갈린다:
   * - write-preferring: 대기 writer가 있으면 FIFO로 1명, 없으면 대기 reader 전부
   * - read-preferring: 대기 reader가 있으면 전부, 없으면 writer 1명
   *
   * 아직 누군가 lock을 hold 중이면(reader/writer active) 아무도 깨우지 않는다.
   */
  private dispatch(): void {
    if (this.writerActive || this.readersActive > 0) return

    if (this.preference === 'write') {
      if (this.writerQueue.length > 0) {
        this.writerQueue.shift()!()
      } else {
        this.drainReaders()
      }
    } else {
      if (this.readerQueue.length > 0) {
        this.drainReaders()
      } else if (this.writerQueue.length > 0) {
        this.writerQueue.shift()!()
      }
    }
  }

  /**
   * 대기 중인 reader resolver를 한 번에 모두 깨운다 (condition variable broadcast 대응).
   */
  private drainReaders(): void {
    const pending = this.readerQueue.splice(0)
    for (const r of pending) r()
  }

  /**
   * read lock 안에서 `fn`을 실행하고, 완료/예외와 무관하게 lock을 반환합니다.
   *
   * @param fn lock을 hold한 채 실행할 콜백 (동기/비동기 모두 허용)
   * @returns `fn`의 반환값으로 resolve 되는 Promise
   */
  async withRead<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquireRead()
    try {
      return await fn()
    } finally {
      this.releaseRead()
    }
  }

  /**
   * write lock 안에서 `fn`을 실행하고, 완료/예외와 무관하게 lock을 반환합니다.
   *
   * @param fn lock을 단독 hold한 채 실행할 콜백 (동기/비동기 모두 허용)
   * @returns `fn`의 반환값으로 resolve 되는 Promise
   */
  async withWrite<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquireWrite()
    try {
      return await fn()
    } finally {
      this.releaseWrite()
    }
  }

  /**
   * 디버깅용 내부 상태 스냅샷을 반환합니다.
   */
  inspect(): {
    readersActive: number
    writersWaiting: number
    writerActive: boolean
    queuedReaders: number
    queuedWriters: number
    preference: 'read' | 'write'
  } {
    return {
      readersActive: this.readersActive,
      writersWaiting: this.writersWaiting,
      writerActive: this.writerActive,
      queuedReaders: this.readerQueue.length,
      queuedWriters: this.writerQueue.length,
      preference: this.preference,
    }
  }
}
