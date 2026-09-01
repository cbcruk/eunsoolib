import { escapeHtml, overrideTag } from './panel.utils'
import type { Override } from './types'

function override(patch: Partial<Override> = {}): Override {
  return {
    id: 'GET /users',
    method: 'get',
    path: '/users',
    enabled: true,
    mode: 'json',
    status: 200,
    delay: 0,
    body: null,
    ...patch,
  }
}

describe('escapeHtml', () => {
  it('마크업을 깨뜨리는 문자를 엔티티로 바꿔야 함', () => {
    expect(escapeHtml('<script>"&"</script>')).toBe(
      '&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;',
    )
  })

  it('속성 자리에 넣어도 따옴표를 탈출하지 못하게 해야 함', () => {
    expect(escapeHtml('" onclick="alert(1)')).not.toContain('"')
  })

  it('바꿀 게 없으면 그대로 둬야 함', () => {
    expect(escapeHtml('/users/:id')).toBe('/users/:id')
  })
})

describe('overrideTag', () => {
  it('꺼진 오버라이드는 빈 문자열이어야 함', () => {
    expect(overrideTag(override({ enabled: false }))).toBe('')
  })

  it('json 모드는 상태 코드를 보여줘야 함', () => {
    expect(overrideTag(override({ status: 500 }))).toBe('500')
  })

  it('passthrough와 network-error는 줄인 말을 보여줘야 함', () => {
    expect(overrideTag(override({ mode: 'passthrough' }))).toBe('pass')
    expect(overrideTag(override({ mode: 'network-error' }))).toBe('error')
  })
})
