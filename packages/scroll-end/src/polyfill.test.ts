import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installScrollEndPolyfill } from './polyfill'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('installScrollEndPolyfill (미지원 환경)', () => {
  beforeEach(() => {
    // jsdom은 onscrollend를 보고하므로, 미지원 환경을 강제한다
    vi.stubGlobal('window', {})
  })

  it('스크롤이 멈추면 scrollend를 합성 발행해야 함', () => {
    const target = document.createElement('div')
    const onScrollEnd = vi.fn()
    target.addEventListener('scrollend', onScrollEnd)

    installScrollEndPolyfill(target, { idleDelay: 100 })

    target.dispatchEvent(new Event('scroll'))
    expect(onScrollEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('연속 스크롤은 마지막 멈춤 이후 한 번만 발행해야 함 (debounce)', () => {
    const target = document.createElement('div')
    const onScrollEnd = vi.fn()
    target.addEventListener('scrollend', onScrollEnd)

    installScrollEndPolyfill(target, { idleDelay: 100 })

    target.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(50)
    target.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(50)
    expect(onScrollEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(onScrollEnd).toHaveBeenCalledOnce()
  })

  it('cleanup 이후에는 발행하지 않아야 함', () => {
    const target = document.createElement('div')
    const onScrollEnd = vi.fn()
    target.addEventListener('scrollend', onScrollEnd)

    const uninstall = installScrollEndPolyfill(target, { idleDelay: 100 })
    uninstall()

    target.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    expect(onScrollEnd).not.toHaveBeenCalled()
  })
})

describe('installScrollEndPolyfill (지원 환경)', () => {
  it('네이티브 지원 시 아무것도 하지 않아야 함', () => {
    vi.stubGlobal('onscrollend', null)
    const target = document.createElement('div')
    const onScrollEnd = vi.fn()
    target.addEventListener('scrollend', onScrollEnd)

    installScrollEndPolyfill(target, { idleDelay: 100 })

    target.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    expect(onScrollEnd).not.toHaveBeenCalled()
  })
})
