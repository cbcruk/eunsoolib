import { describe, it, expect, vi, afterEach } from 'vitest'
import { isScrollEndSupported } from './feature-detection'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isScrollEndSupported', () => {
  it('window에 onscrollend가 있으면 true여야 함', () => {
    vi.stubGlobal('onscrollend', null)
    expect(isScrollEndSupported()).toBe(true)
  })

  it('window에 onscrollend가 없으면 false여야 함', () => {
    vi.stubGlobal('window', {})
    expect(isScrollEndSupported()).toBe(false)
  })

  it('SSR(window 없음)에서는 false여야 함', () => {
    vi.stubGlobal('window', undefined)
    expect(isScrollEndSupported()).toBe(false)
  })
})
