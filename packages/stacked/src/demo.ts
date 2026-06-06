import { Stack } from './stack'

/** gh-stack 개요 페이지의 예제를 그대로 재현. */
export function demo(): void {
  const stack = Stack.from('main', [
    'feat/auth-layer',
    'feat/api-endpoints',
    'feat/frontend',
  ])

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

  console.log('── initial ──')
  console.log(stack.render())

  // gh stack bottom; gh stack up
  stack.bottom()
  stack.up()
  console.log('\n── after `bottom` then `up` ──')
  console.log(`cursor = ${stack.current}`)

  // 맨 아래 PR 병합. #1 direct merge → #1만 병합되고 #2는 main 위로 rebase.
  const r = stack.mergeUpTo('feat/auth-layer')
  if (r.ok) {
    console.log('\n── after merging feat/auth-layer ──')
    console.log(`merged: ${r.value.merged.map((l) => l.branch).join(', ')}`)
    console.log(stack.render())
  }
}
