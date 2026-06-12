import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createScrollSpy, supportsScrollTargetGroup } from './scroll-spy'
import { generateToc, generateStyles } from './toc'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed = new Set<Element>()
  disconnected = false

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe(el: Element): void {
    this.observed.add(el)
  }

  unobserve(el: Element): void {
    this.observed.delete(el)
  }

  disconnect(): void {
    this.observed.clear()
    this.disconnected = true
  }

  trigger(
    entries: Array<{ id: string; isIntersecting: boolean; top: number }>,
  ): void {
    this.callback(
      entries.map((e) => ({
        target: document.getElementById(e.id) as Element,
        isIntersecting: e.isIntersecting,
        boundingClientRect: { top: e.top } as DOMRectReadOnly,
      })) as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    )
  }

  static latest(): MockIntersectionObserver {
    return this.instances[this.instances.length - 1]!
  }
}

function buildDom(): HTMLElement {
  document.body.innerHTML = `
    <nav id="nav">
      <a href="#a">A</a>
      <a href="#b">B</a>
    </nav>
    <section id="a">A</section>
    <section id="b">B</section>
  `
  return document.getElementById('nav') as HTMLElement
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  vi.stubGlobal('CSS', { supports: () => false })
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('supportsScrollTargetGroup', () => {
  it('CSS.supports가 true면 true를 반환해야 함', () => {
    vi.stubGlobal('CSS', { supports: () => true })
    expect(supportsScrollTargetGroup()).toBe(true)
  })

  it('CSS.supports가 false면 false를 반환해야 함', () => {
    vi.stubGlobal('CSS', { supports: () => false })
    expect(supportsScrollTargetGroup()).toBe(false)
  })

  it('CSS가 없으면 false를 반환해야 함', () => {
    vi.stubGlobal('CSS', undefined)
    expect(supportsScrollTargetGroup()).toBe(false)
  })
})

describe('createScrollSpy (IntersectionObserver 폴백)', () => {
  it('네이티브 미지원 시 isNative는 false여야 함', () => {
    const nav = buildDom()
    const spy = createScrollSpy(nav)
    expect(spy.isNative).toBe(false)
  })

  it('링크가 가리키는 섹션들을 관찰해야 함', () => {
    const nav = buildDom()
    createScrollSpy(nav)

    const io = MockIntersectionObserver.latest()
    expect(io.observed.size).toBe(2)
  })

  it('보이는 섹션 중 가장 위의 것을 active로 표시하고 onChange를 호출해야 함', () => {
    const nav = buildDom()
    const onChange = vi.fn()
    const spy = createScrollSpy(nav, { onChange })
    const io = MockIntersectionObserver.latest()

    io.trigger([{ id: 'a', isIntersecting: true, top: 10 }])

    expect(spy.currentId).toBe('a')
    expect(
      document.querySelector('a[href="#a"]')!.classList.contains('active'),
    ).toBe(true)
    expect(onChange).toHaveBeenCalledWith('a', document.getElementById('a'))
  })

  it('더 위에 있는 섹션이 들어오면 active를 그쪽으로 옮겨야 함', () => {
    const nav = buildDom()
    const spy = createScrollSpy(nav)
    const io = MockIntersectionObserver.latest()

    io.trigger([{ id: 'a', isIntersecting: true, top: 100 }])
    io.trigger([{ id: 'b', isIntersecting: true, top: 5 }])

    expect(spy.currentId).toBe('b')
    expect(
      document.querySelector('a[href="#b"]')!.classList.contains('active'),
    ).toBe(true)
    expect(
      document.querySelector('a[href="#a"]')!.classList.contains('active'),
    ).toBe(false)
  })

  it('커스텀 activeClass와 currentAttribute를 적용해야 함', () => {
    const nav = buildDom()
    createScrollSpy(nav, {
      activeClass: 'is-current',
      currentAttribute: 'data-active',
    })
    const io = MockIntersectionObserver.latest()

    io.trigger([{ id: 'a', isIntersecting: true, top: 10 }])

    const link = document.querySelector('a[href="#a"]')!
    expect(link.classList.contains('is-current')).toBe(true)
    expect(link.hasAttribute('data-active')).toBe(true)
  })

  it('refresh는 관찰자를 다시 설정해야 함', () => {
    const nav = buildDom()
    const spy = createScrollSpy(nav)
    const first = MockIntersectionObserver.latest()

    spy.refresh()

    expect(first.disconnected).toBe(true)
    expect(MockIntersectionObserver.instances).toHaveLength(2)
  })

  it('destroy는 관찰자를 끊고 active 상태를 정리해야 함', () => {
    const nav = buildDom()
    const spy = createScrollSpy(nav)
    const io = MockIntersectionObserver.latest()

    io.trigger([{ id: 'a', isIntersecting: true, top: 10 }])
    spy.destroy()

    expect(io.disconnected).toBe(true)
    expect(
      document.querySelector('a[href="#a"]')!.classList.contains('active'),
    ).toBe(false)
  })
})

describe('generateToc', () => {
  it('헤딩에서 nav>ul>li>a 구조를 생성해야 함', () => {
    document.body.innerHTML = `
      <h2 id="intro">Intro</h2>
      <h3 id="details">Details</h3>
    `

    const nav = generateToc({ container: document.body })

    expect(nav.tagName).toBe('NAV')
    const links = nav.querySelectorAll('a.scroll-spy-link')
    expect(links).toHaveLength(2)
    expect(links[0]!.getAttribute('href')).toBe('#intro')
    expect(links[1]!.getAttribute('href')).toBe('#details')
  })

  it('id가 없는 헤딩은 텍스트로 id를 만들어야 함', () => {
    document.body.innerHTML = `<h2>Getting Started</h2>`

    generateToc({ container: document.body })

    expect(document.querySelector('h2')!.id).toBe('getting-started')
  })

  it('levels 옵션으로 포함할 헤딩을 제한해야 함', () => {
    document.body.innerHTML = `
      <h2 id="a">A</h2>
      <h3 id="b">B</h3>
    `

    const nav = generateToc({ container: document.body, levels: ['h2'] })

    expect(nav.querySelectorAll('a')).toHaveLength(1)
  })
})

describe('generateStyles', () => {
  it('active 클래스와 :target-current를 모두 포함해야 함', () => {
    const css = generateStyles({ activeClass: 'on', activeColor: 'red' })

    expect(css).toContain('.scroll-spy-link.on')
    expect(css).toContain(':target-current')
    expect(css).toContain('red')
    expect(css).toContain('scroll-target-group: auto')
  })
})
