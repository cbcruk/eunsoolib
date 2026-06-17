import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import { useHighlight, useHighlightCount } from './highlight-context'
import { findTextMatches } from './find-text-matches'
import type { UseHighlightSearchResult, UseTextMatchesOptions } from './types'

/**
 * container 안에서 pattern과 일치하는 Range들을 추적한다. children 변동은
 * MutationObserver(childList/subtree/characterData)로 따라간다.
 */
export function useTextMatches(
  containerRef: RefObject<Element | null>,
  pattern: string | RegExp,
  options: UseTextMatchesOptions = {},
): Range[] {
  const { caseSensitive, wholeWord, observe = true } = options
  const [ranges, setRanges] = useState<Range[]>([])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = (): void =>
      setRanges(findTextMatches(el, pattern, { caseSensitive, wholeWord }))
    compute()
    if (!observe) return
    const mo = new MutationObserver(compute)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => mo.disconnect()
  }, [containerRef, pattern, caseSensitive, wholeWord, observe])

  return ranges
}

/**
 * 검색 + 현재 항목 네비게이션. 전체 매치는 `search`, 현재 항목은 `search-current`
 * 이름에 더 높은 priority로 하이라이트한다. 현재 항목은 자동으로 스크롤된다.
 */
export function useHighlightSearch(
  containerRef: RefObject<Element | null>,
  query: string | RegExp,
  options: UseTextMatchesOptions = {},
): UseHighlightSearchResult {
  const matches = useTextMatches(containerRef, query, options)
  const [active, setActive] = useState(0)

  useLayoutEffect(() => {
    setActive((a) =>
      matches.length === 0 ? 0 : Math.min(a, matches.length - 1),
    )
  }, [matches])

  const activeRange = useMemo<Range[]>(
    () => (matches[active] ? [matches[active]] : []),
    [matches, active],
  )

  useHighlight('search', matches, 0)
  useHighlight('search-current', activeRange, 1)

  useEffect(() => {
    const el = matches[active]?.startContainer?.parentElement
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [matches, active])

  const count = useHighlightCount('search')
  const next = useCallback(
    () => setActive((a) => (matches.length ? (a + 1) % matches.length : 0)),
    [matches.length],
  )
  const prev = useCallback(
    () =>
      setActive((a) =>
        matches.length ? (a - 1 + matches.length) % matches.length : 0,
      ),
    [matches.length],
  )

  return { count, active: matches.length ? active : -1, next, prev }
}
