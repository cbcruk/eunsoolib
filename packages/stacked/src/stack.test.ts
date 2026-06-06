import { describe, it, expect } from 'vitest'
import { Stack } from './index'
import type { PullRequest, Result, StackError } from './index'

function expectOk<T>(r: Result<T, StackError>): T {
  if (!r.ok) throw new Error(`expected ok, got error: ${r.error.type}`)
  return r.value
}

function expectErr<T>(r: Result<T, StackError>): StackError {
  if (r.ok) throw new Error('expected error, got ok')
  return r.error
}

const pr = (number: number): PullRequest => ({
  number,
  title: `PR ${number}`,
  status: 'open',
})

describe('Stack 생성', () => {
  it('새 스택은 trunk만 가지고 비어 있음', () => {
    const s = new Stack('main')

    expect(s.trunk).toBe('main')
    expect(s.current).toBe('main')
    expect(s.size).toBe(0)
    expect(s.isEmpty).toBe(true)
    expect(s.view()).toEqual([])
  })

  it('from()은 브랜치 배열로 스택을 한 번에 구성', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    expect(s.size).toBe(3)
    expect(s.view().map((l) => l.branch)).toEqual(['a', 'b', 'c'])
    expect(s.current).toBe('c')
  })

  it('from()은 중복 브랜치를 만나면 예외를 던짐', () => {
    expect(() => Stack.from('main', ['a', 'a'])).toThrow(/BranchExists/)
  })
})

describe('불변식', () => {
  it('맨 아래 레이어의 base는 trunk (bottom invariant)', () => {
    const s = Stack.from('main', ['a', 'b'])

    expect(s.view()[0].base).toBe('main')
  })

  it('각 레이어의 base는 바로 아래 브랜치 (chain invariant)', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    expect(s.view()[1].base).toBe('a')
    expect(s.view()[2].base).toBe('b')
  })
})

describe('add', () => {
  it('top에 있을 때 새 브랜치를 추가하고 커서를 이동', () => {
    const s = Stack.from('main', ['a'])

    const layer = expectOk(s.add('b'))

    expect(layer).toEqual({ branch: 'b', base: 'a' })
    expect(s.current).toBe('b')
    expect(s.size).toBe(2)
  })

  it('커서가 top이 아니면 NotOnTop 에러', () => {
    const s = Stack.from('main', ['a', 'b'])
    s.checkout('a')

    const error = expectErr(s.add('c'))

    expect(error).toEqual({ type: 'NotOnTop', current: 'a', top: 'b' })
  })

  it('이미 존재하는 브랜치는 BranchExists 에러', () => {
    const s = Stack.from('main', ['a'])

    const error = expectErr(s.add('a'))

    expect(error).toEqual({ type: 'BranchExists', branch: 'a' })
  })
})

describe('attachPR', () => {
  it('레이어에 PR을 연결', () => {
    const s = Stack.from('main', ['a'])

    const layer = expectOk(s.attachPR('a', pr(1)))

    expect(layer.pr).toEqual(pr(1))
    expect(s.view()[0].pr).toEqual(pr(1))
  })

  it('없는 브랜치는 BranchNotFound 에러', () => {
    const s = Stack.from('main', ['a'])

    const error = expectErr(s.attachPR('x', pr(1)))

    expect(error).toEqual({ type: 'BranchNotFound', branch: 'x' })
  })
})

describe('mergeUpTo', () => {
  it('맨 아래 브랜치만 병합하면 나머지는 trunk로 rebase', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    const { merged, remaining } = expectOk(s.mergeUpTo('a'))

    expect(merged.map((l) => l.branch)).toEqual(['a'])
    expect(remaining.map((l) => l.branch)).toEqual(['b', 'c'])
    expect(s.view()[0].base).toBe('main')
  })

  it('중간 브랜치를 병합하면 그 아래 전부 bottom-up으로 병합', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    const { merged, remaining } = expectOk(s.mergeUpTo('b'))

    expect(merged.map((l) => l.branch)).toEqual(['a', 'b'])
    expect(remaining.map((l) => l.branch)).toEqual(['c'])
    expect(s.view()[0].base).toBe('main')
  })

  it('top 브랜치를 병합하면 스택이 비고 커서가 trunk로 이동', () => {
    const s = Stack.from('main', ['a', 'b'])

    expectOk(s.mergeUpTo('b'))

    expect(s.isEmpty).toBe(true)
    expect(s.current).toBe('main')
  })

  it('병합된 PR은 merged 상태가 됨', () => {
    const s = Stack.from('main', ['a'])
    s.attachPR('a', pr(1))

    const { merged } = expectOk(s.mergeUpTo('a'))

    expect(merged[0].pr?.status).toBe('merged')
  })

  it('커서가 병합 대상 위에 있으면 새 맨 아래로 이동', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])
    s.checkout('a')

    expectOk(s.mergeUpTo('a'))

    expect(s.current).toBe('b')
  })

  it('커서가 병합되지 않은 브랜치면 그대로 유지', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])
    s.checkout('c')

    expectOk(s.mergeUpTo('a'))

    expect(s.current).toBe('c')
  })

  it('없는 브랜치는 BranchNotFound 에러', () => {
    const s = Stack.from('main', ['a'])

    const error = expectErr(s.mergeUpTo('x'))

    expect(error).toEqual({ type: 'BranchNotFound', branch: 'x' })
  })
})

describe('네비게이션', () => {
  it('up은 trunk에서 멀어지는 방향으로 이동', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])
    s.bottom()

    expect(expectOk(s.up())).toBe('b')
  })

  it('trunk에서 up하면 첫 번째 레이어로 이동', () => {
    const s = Stack.from('main', ['a', 'b'])
    s.checkout('main')

    expect(expectOk(s.up())).toBe('a')
  })

  it('up(n)은 n칸 이동하고 top에서 멈춤', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])
    s.bottom()

    expect(expectOk(s.up(10))).toBe('c')
  })

  it('top에서 up하면 BoundaryReached 에러', () => {
    const s = Stack.from('main', ['a', 'b'])

    const error = expectErr(s.up())

    expect(error).toEqual({ type: 'BoundaryReached', direction: 'up' })
  })

  it('down은 trunk에 가까워지는 방향으로 이동', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    expect(expectOk(s.down())).toBe('b')
  })

  it('down(n)은 n칸 이동하고 bottom에서 멈춤', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    expect(expectOk(s.down(10))).toBe('a')
  })

  it('trunk에서 down하면 BoundaryReached 에러', () => {
    const s = Stack.from('main', ['a'])
    s.checkout('main')

    const error = expectErr(s.down())

    expect(error).toEqual({ type: 'BoundaryReached', direction: 'down' })
  })

  it('top/bottom은 양 끝으로 점프', () => {
    const s = Stack.from('main', ['a', 'b', 'c'])

    expect(expectOk(s.bottom())).toBe('a')
    expect(expectOk(s.top())).toBe('c')
  })

  it('checkout은 임의의 브랜치와 trunk로 이동', () => {
    const s = Stack.from('main', ['a', 'b'])

    expect(expectOk(s.checkout('a'))).toBe('a')
    expect(expectOk(s.checkout('main'))).toBe('main')
  })

  it('checkout은 없는 브랜치에 BranchNotFound 에러', () => {
    const s = Stack.from('main', ['a'])

    const error = expectErr(s.checkout('x'))

    expect(error).toEqual({ type: 'BranchNotFound', branch: 'x' })
  })

  it('빈 스택에서 이동하면 EmptyStack 에러', () => {
    const s = new Stack('main')

    expect(expectErr(s.up())).toEqual({ type: 'EmptyStack' })
    expect(expectErr(s.down())).toEqual({ type: 'EmptyStack' })
    expect(expectErr(s.top())).toEqual({ type: 'EmptyStack' })
    expect(expectErr(s.bottom())).toEqual({ type: 'EmptyStack' })
  })
})

describe('조회', () => {
  it('indexOf는 레이어 인덱스를, 없으면 -1을 반환', () => {
    const s = Stack.from('main', ['a', 'b'])

    expect(s.indexOf('a')).toBe(0)
    expect(s.indexOf('b')).toBe(1)
    expect(s.indexOf('main')).toBe(-1)
    expect(s.indexOf('x')).toBe(-1)
  })

  it('has는 레이어 존재 여부를 반환 (trunk는 레이어가 아님)', () => {
    const s = Stack.from('main', ['a'])

    expect(s.has('a')).toBe(true)
    expect(s.has('main')).toBe(false)
    expect(s.has('x')).toBe(false)
  })
})

describe('render', () => {
  it('커서 위치를 표시하고 trunk로 끝나는 다이어그램을 생성', () => {
    const s = Stack.from('main', ['a'])
    s.attachPR('a', { number: 1, title: 'A', status: 'open' })

    const output = s.render()

    expect(output).toContain('→ a  (base: main)  PR #1 [open]')
    expect(output).toContain('  main  (trunk)')
  })

  it('PR이 없는 레이어는 (no PR)로 표시', () => {
    const s = Stack.from('main', ['a'])

    expect(s.render()).toContain('(no PR)')
  })
})
