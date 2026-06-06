import { describe, it, expect } from 'vitest'
import { RWLock } from './index'

describe('reader 병렬성', () => {
  it('여러 reader가 동시에 lock을 hold 할 수 있어야 함', async () => {
    const lock = new RWLock()

    await lock.acquireRead()
    await lock.acquireRead()
    await lock.acquireRead()

    expect(lock.inspect().readersActive).toBe(3)

    lock.releaseRead()
    lock.releaseRead()
    lock.releaseRead()

    expect(lock.inspect().readersActive).toBe(0)
  })
})

describe('writer 배타성', () => {
  it('writer가 hold 중이면 다른 writer는 release까지 대기해야 함', async () => {
    const lock = new RWLock()
    const order: string[] = []

    await lock.acquireWrite()
    order.push('W1')

    const w2 = lock.acquireWrite().then(() => order.push('W2'))
    expect(order).toEqual(['W1'])

    lock.releaseWrite()
    await w2

    expect(order).toEqual(['W1', 'W2'])
    lock.releaseWrite()
  })
})

describe('write-preferring (디폴트)', () => {
  it('writer가 대기 중이면 새 reader가 writer 뒤로 밀려야 함', async () => {
    const lock = new RWLock()
    const order: string[] = []

    await lock.acquireRead()

    const w = lock.acquireWrite().then(() => order.push('W'))
    const r = lock.acquireRead().then(() => order.push('R'))

    expect(lock.inspect().queuedReaders).toBe(1)

    lock.releaseRead()
    await w
    lock.releaseWrite()
    await r

    expect(order).toEqual(['W', 'R'])
    lock.releaseRead()
  })
})

describe('read-preferring', () => {
  it('writer가 대기 중이어도 새 reader가 즉시 들어와야 함', async () => {
    const lock = new RWLock({ preference: 'read' })
    const order: string[] = []

    await lock.acquireRead()

    const w = lock.acquireWrite().then(() => order.push('W'))

    await lock.acquireRead()
    order.push('R')
    expect(lock.inspect().readersActive).toBe(2)

    lock.releaseRead()
    lock.releaseRead()
    await w

    expect(order).toEqual(['R', 'W'])
    lock.releaseWrite()
  })
})

describe('withRead / withWrite 헬퍼', () => {
  it('withWrite 내부에서 throw 해도 lock이 release 되어야 함', async () => {
    const lock = new RWLock()

    await expect(
      lock.withWrite(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(lock.inspect()).toMatchObject({
      writerActive: false,
      readersActive: 0,
      queuedWriters: 0,
    })

    const result = await lock.withRead(async () => 42)
    expect(result).toBe(42)
  })
})
