# @eunsoolib/rw-lock

single-threaded async 환경(브라우저 / Node)을 위한 Readers–Writer Lock

JS/TS는 single-threaded라 진짜 thread contention은 없지만, 비동기 작업 간의 동시성 제어(IndexedDB 트랜잭션, fetch 시퀀스, in-memory 캐시 갱신)에는 똑같이 RW lock 패턴이 유효합니다. mutex / condition variable 대신 Promise queue로 환원하면 깔끔하게 떨어집니다.

## 설치

```bash
pnpm add @eunsoolib/rw-lock
```

## 핵심 동작

| 동작             | 규칙                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Reader 병렬성    | 여러 reader가 동시에 lock을 hold 할 수 있음                       |
| Writer 배타성    | writer는 단독으로만 lock을 hold (다른 reader/writer 모두 차단)    |
| Write-preferring | (디폴트) writer가 대기 중이면 새 reader도 차단 → writer 기아 방지 |
| Read-preferring  | writer가 active일 때만 reader 차단 → 동시성 최대화                |

## 사용법

### withRead / withWrite (권장)

`acquire` / `release`를 직접 다루는 대신 헬퍼를 쓰면 `finally`로 release가 보장되어 안전합니다.

```typescript
import { RWLock } from '@eunsoolib/rw-lock'

const lock = new RWLock() // 디폴트: write-preferring

const value = await lock.withRead(() => readSomething())

await lock.withWrite(async () => {
  await mutateSomething() // 동안 모든 read/write 차단
})
```

블록 내부에서 `throw`가 발생해도 lock은 정상적으로 release 됩니다.

### acquire / release (수동)

```typescript
await lock.acquireRead()
try {
  // ... read 작업
} finally {
  lock.releaseRead()
}

await lock.acquireWrite()
try {
  // ... write 작업
} finally {
  lock.releaseWrite()
}
```

### Read-preferring 모드

```typescript
const lock = new RWLock({ preference: 'read' })
```

writer가 대기 중이어도 새 reader가 즉시 끼어들어 동시성을 최대화합니다. 단, write가 지속적으로 들어오면 writer starvation 위험이 있습니다.

## 실용 예시 — 일관성 있는 캐시 갱신

```typescript
class Cache<K, V> {
  private readonly lock = new RWLock() // write-preferring
  private map = new Map<K, V>()

  get(key: K) {
    return this.lock.withRead(() => this.map.get(key))
  }

  async refresh(loader: () => Promise<Map<K, V>>) {
    return this.lock.withWrite(async () => {
      this.map = await loader() // 동안 모든 read 차단
    })
  }
}
```

`refresh` 도중에는 `get`이 자동으로 대기하다가 새 Map으로 일관성 있게 읽습니다 — atomic하지 않은 업데이트 중 invalid state를 읽는 걸 막는, RW lock의 대표적인 use case입니다.

## API

### `new RWLock(options?)`

```typescript
interface RWLockOptions {
  /**
   * 'write' (default): write-preferring. writer 대기 중이면 새 reader 차단.
   * 'read': read-preferring. writer가 active일 때만 reader 차단.
   */
  preference?: 'read' | 'write'
}
```

| 메서드           | 반환            | 설명                                        |
| ---------------- | --------------- | ------------------------------------------- |
| `acquireRead()`  | `Promise<void>` | read lock 획득 (가능하면 즉시, 아니면 대기) |
| `releaseRead()`  | `void`          | read lock 반환                              |
| `acquireWrite()` | `Promise<void>` | write lock 획득 (단독 점유까지 대기)        |
| `releaseWrite()` | `void`          | write lock 반환                             |
| `withRead(fn)`   | `Promise<T>`    | read lock 안에서 `fn` 실행 후 자동 release  |
| `withWrite(fn)`  | `Promise<T>`    | write lock 안에서 `fn` 실행 후 자동 release |
| `inspect()`      | snapshot        | 디버깅용 내부 상태 스냅샷                   |

## 동작 검증 (src/rw-lock.test.ts)

| 테스트 | 시나리오                                      | 기대 결과                                     |
| ------ | --------------------------------------------- | --------------------------------------------- |
| 1      | 세 reader 동시 진입                           | 모두 0ms에 start, 50ms 후 동시 종료           |
| 2      | 세 writer 경합                                | W1 → W2 → W3 순차 (30ms씩, 총 ~90ms)          |
| 3      | write-preferring: writer 대기 중 R3 새로 요청 | R3는 writer 뒤로 밀림 (starvation 방지)       |
| 4      | read-preferring: writer 대기 중 R2 새로 요청  | R2가 W보다 먼저 acquire (동시성 최대화)       |
| 5      | `withWrite` 내부 `throw`                      | `finally`로 release되어 state가 완전히 깨끗함 |

## Wikipedia 의사코드 → JS 매핑

write-preferring을 디폴트로 채택했습니다 (read-preferring은 writer starvation 위험이 있어 일반적으로 write-preferring이 안전한 디폴트).

| 의사코드                  | JS 구현                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `num_readers_active`      | `this.readersActive` — 현재 lock을 hold 중인 reader 수                                      |
| `num_writers_waiting`     | `this.writersWaiting` — 대기 중인 writer 수 (write-preferring 차단 판정의 기준)             |
| `writer_active`           | `this.writerActive` — writer가 단독 점유 중인지 여부                                        |
| `Lock g`                  | 불필요 — JS는 single-threaded라 `acquireXxx` 함수 본문이 이미 atomic                        |
| `cond + while (...) wait` | `new Promise(resolve => queue.push(resolve))` — resolver를 queue에 넣고 release 측에서 호출 |
| `Notify cond (broadcast)` | reader queue(`readerQueue`)를 `splice(0)`으로 통째로 drain                                  |

JS는 함수 본문이 microtask 경계 사이에서 끊기지 않으므로 mutex `g` 자체가 필요 없는 게 핵심 단순화 포인트입니다. Pthread / Java 의사코드의 condition variable wait/notify가 그대로 Promise queue(`readerQueue` / `writerQueue`)로 1:1 매핑됩니다.

## 의도적으로 뺀 것들

- **Upgrade lock (read → write)**: 위키에서도 지적했듯 두 reader가 동시에 upgrade하면 deadlock. 정말 필요할 때만 별도 API로 추가하는 게 안전합니다.
- **Reentrancy (재진입)**: Java의 `ReentrantReadWriteLock` 같은 것. async context에는 같은 "thread" 개념이 없어 `AsyncLocalStorage`나 명시적 owner 전달이 필요한데, 간단한 RW lock에는 오버킬입니다.
- **Timeout / cancellation**: `AbortSignal` 지원은 깔끔하게 확장 가능 (`acquireRead({ signal })`에서 abort 시 queue에서 자기 resolver 제거 + reject).
