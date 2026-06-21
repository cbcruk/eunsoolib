import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { type ReactNode } from 'react'
import { LocaleProvider, useFormatters, useI18nStore } from './react'
import { I18nStore } from './i18n-store'

function wrapper(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  )
}

describe('useFormatters', () => {
  it('Provider의 locale로 포맷해야 함', () => {
    const { result } = renderHook(() => useFormatters(), {
      wrapper: wrapper('en-US'),
    })
    expect(result.current.number.format(1234.5)).toBe('1,234.5')
    expect(result.current.currency('USD').format(5).startsWith('$')).toBe(true)
  })

  it('locale이 그대로면 같은 포매터 묶음을 유지해야 함', () => {
    const { result, rerender } = renderHook(() => useFormatters(), {
      wrapper: wrapper('en-US'),
    })
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('locale에 따라 다른 포맷을 내야 함', () => {
    const { result } = renderHook(() => useFormatters(), {
      wrapper: wrapper('de-DE'),
    })
    expect(result.current.number.format(1234.5)).toBe('1.234,5')
  })
})

describe('useI18nStore', () => {
  it('store의 locale을 구독하고 setLocale에 반응해 리렌더해야 함', () => {
    const store = new I18nStore('en-US', 'UTC')

    function Display(): ReactNode {
      const locale = useI18nStore(store)
      return <span data-testid="tag">{locale.toString()}</span>
    }

    render(<Display />)
    expect(screen.getByTestId('tag').textContent).toBe('en-Latn-US')

    act(() => store.setLocale('ko-KR'))
    expect(screen.getByTestId('tag').textContent).toBe('ko-Kore-KR')
  })
})
