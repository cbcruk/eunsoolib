import type { ReactNode } from 'react'

/**
 * `useHighlightSearch`/데모가 쓰는 기본 하이라이트 색상. `::highlight()`는 box model을
 * 지원하지 않으므로 color/background-color/text-decoration 계열만 적용한다.
 */
export function HighlightStyles(): ReactNode {
  return (
    <style>{`
      ::highlight(search) { background-color: rgb(253 224 71); color: rgb(113 63 18); }
      ::highlight(search-current) { background-color: rgb(249 115 22); color: white; }
      ::highlight(log-error) { background-color: rgb(254 202 202); color: rgb(127 29 29); text-decoration: underline wavy rgb(220 38 38); text-underline-offset: 2px; }
      ::highlight(log-warn)  { background-color: rgb(254 243 199); color: rgb(120 53 15); }
      ::highlight(log-info)  { background-color: rgb(219 234 254); color: rgb(30 64 175); }
      ::highlight(kw-keyword){ color: rgb(192 132 252); font-weight: 600; }
      ::highlight(kw-number) { color: rgb(251 146 60); }
      ::highlight(kw-comment){ color: rgb(148 163 184); font-style: italic; }
    `}</style>
  )
}
