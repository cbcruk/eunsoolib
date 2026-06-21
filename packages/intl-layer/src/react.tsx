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

export interface LocaleProviderProps {
  locale: LocaleInput
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

export function useLocale(): Intl.Locale {
  return useContext(LocaleContext)
}

/** locale이 바뀔 때만 재생성되는 포매터 묶음. reference equality로 캐싱된다. */
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
