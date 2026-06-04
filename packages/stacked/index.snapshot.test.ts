import { describe, it, expect } from 'vitest'
import { Stack } from './index'

/**
 * 시각적 회귀 테스트 — 일련의 gh-stack 연산을 실행하면서 매 단계의
 * render() 출력을 하나의 트랜스크립트로 모아 스냅샷으로 고정한다.
 * 동작이 바뀌면 PR diff에서 다이어그램이 어떻게 달라졌는지 바로 보인다.
 */
class Transcript {
  private readonly steps: string[] = []
  constructor(private readonly stack: Stack) {}

  step(label: string): this {
    this.steps.push(`── ${label} ──\n${this.stack.render()}`)
    return this
  }

  toString(): string {
    return this.steps.join('\n\n')
  }
}

describe('시각적 회귀 (render 트랜스크립트)', () => {
  it('init → submit → navigate → merge 전체 흐름', () => {
    const stack = Stack.from('main', [
      'feat/auth-layer',
      'feat/api-endpoints',
      'feat/frontend',
    ])
    const t = new Transcript(stack)

    t.step('init')

    stack.attachPR('feat/auth-layer', {
      number: 1,
      title: 'Auth layer',
      status: 'open',
    })
    stack.attachPR('feat/api-endpoints', {
      number: 2,
      title: 'API routes',
      status: 'open',
    })
    stack.attachPR('feat/frontend', { number: 3, title: 'UI', status: 'draft' })
    t.step('submit (PR 연결)')

    stack.bottom()
    stack.up()
    t.step('bottom; up (커서 이동)')

    stack.mergeUpTo('feat/auth-layer')
    t.step('merge feat/auth-layer (#1만 병합, 나머지 rebase)')

    expect(t.toString()).toMatchSnapshot()
  })

  it('맨 위에 브랜치 추가 후 중간 병합으로 bottom-up 병합', () => {
    const stack = Stack.from('main', ['a', 'b'])
    const t = new Transcript(stack)

    t.step('init')

    stack.add('c')
    t.step('add c (top에 추가)')

    stack.mergeUpTo('b')
    t.step('merge b (a, b 함께 병합)')

    expect(t.toString()).toMatchSnapshot()
  })
})
