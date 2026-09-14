import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { maximizeLocale } from './resolve-locale'
import type { I18nStore } from './i18n-store'
import type { Formatters, LocaleInput } from './intl-layer.types'

const LocaleContext = createContext<Intl.Locale>(
  new Intl.Locale('en').maximize(),
)

/** {@link LocaleProvider}의 props. */
export interface LocaleProviderProps {
  /** 트리에 주입할 locale. 태그 문자열이나 `Intl.Locale` 모두 받는다. */
  locale: LocaleInput
  /** locale을 공유할 하위 트리 */
  children?: ReactNode
}

/** 서버에서 결정한 locale을 트리에 주입한다. 항상 maximize해 같은 태그를 공유한다. */
export function LocaleProvider({
  locale,
  children,
}: LocaleProviderProps): ReactNode {
  const tag = typeof locale === 'string' ? locale : locale.toString()
  const value = useMemo(() => maximizeLocale(tag), [tag])
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

/**
 * 가장 가까운 {@link LocaleProvider}의 maximize된 locale을 읽는다.
 *
 * Provider가 없으면 `en`을 maximize한 locale을 반환한다.
 */
export function useLocale(): Intl.Locale {
  return useContext(LocaleContext)
}

/**
 * locale이 바뀔 때만 재생성되는 포매터 묶음. reference equality로 캐싱된다.
 *
 * locale은 {@link LocaleProvider}에서 읽으며 `I18nStore`와는 연결되지 않는다.
 *
 * @example
 * ```tsx
 * import { useFormatters } from '@cbcruk/intl-layer'
 *
 * function Price({ value }: { value: number }) {
 *   const { currency } = useFormatters()
 *   return <span>{currency('KRW').format(value)}</span>
 * }
 * ```
 */
export function useFormatters(): Formatters {
  const locale = useLocale()
  return useMemo<Formatters>(() => {
    const tag = locale.toString()
    return {
      date: new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }),
      number: new Intl.NumberFormat(tag),
      relativeTime: new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }),
      currency: (currency: string) =>
        new Intl.NumberFormat(tag, { style: 'currency', currency }),
    }
  }, [locale])
}

/** vanilla `I18nStore`를 React에 연결한다. `change` 이벤트에 반응해 리렌더한다. */
export function useI18nStore(store: I18nStore): Intl.Locale {
  return useSyncExternalStore(
    (onChange) => {
      store.addEventListener('change', onChange)
      return () => store.removeEventListener('change', onChange)
    },
    () => store.locale,
    () => store.locale,
  )
}
