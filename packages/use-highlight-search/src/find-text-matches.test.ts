import { afterEach, describe, expect, it } from 'vitest'
import { findTextMatches } from './find-text-matches'

let container: HTMLDivElement | null = null

function mount(html: string): HTMLDivElement {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  container?.remove()
  container = null
})

describe('findTextMatches', () => {
  it('container가 null이면 빈 배열을 반환해야 함', () => {
    expect(findTextMatches(null, 'a')).toEqual([])
  })

  it('빈 문자열 패턴은 빈 배열을 반환해야 함', () => {
    const el = mount('hello')
    expect(findTextMatches(el, '')).toEqual([])
  })

  it('대소문자 무시로 모든 매치를 찾아야 함 (기본값)', () => {
    const el = mount('Wisdom and wisdom and WISDOM')
    const ranges = findTextMatches(el, 'wisdom')

    expect(ranges).toHaveLength(3)
    expect(ranges.map((r) => r.toString())).toEqual([
      'Wisdom',
      'wisdom',
      'WISDOM',
    ])
  })

  it('caseSensitive 옵션이 대소문자를 구분해야 함', () => {
    const el = mount('Wisdom and wisdom')
    const ranges = findTextMatches(el, 'wisdom', { caseSensitive: true })

    expect(ranges).toHaveLength(1)
    expect(ranges[0].toString()).toBe('wisdom')
  })

  it('wholeWord 옵션이 단어 경계만 매치해야 함', () => {
    const el = mount('cat category cat')
    const ranges = findTextMatches(el, 'cat', { wholeWord: true })

    expect(ranges).toHaveLength(2)
  })

  it('정규식 특수문자를 리터럴로 이스케이프해야 함', () => {
    const el = mount('price is $5 (five)')
    const ranges = findTextMatches(el, '$5')

    expect(ranges).toHaveLength(1)
    expect(ranges[0].toString()).toBe('$5')
  })

  it('RegExp 패턴을 지원하고 여러 텍스트 노드에 걸쳐 매치해야 함', () => {
    const el = mount('ERROR: a<span>plain</span>ERROR: b')
    const ranges = findTextMatches(el, /ERROR:[^\n]*/)

    expect(ranges).toHaveLength(2)
  })

  it('빈 매치(zero-width)에서 무한 루프 없이 진행해야 함', () => {
    const el = mount('abc')
    const ranges = findTextMatches(el, /x*/)

    expect(ranges).toEqual([])
  })
})
