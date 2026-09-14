'use client'

import type { ComponentType } from 'react'
import { HighlightDemo } from '../../../packages/highlight-kit/src/demo'
import PaginationDemo from '../../../packages/pagination/src/demo'
import { ScopeStyleDemo } from '../../../packages/scope-style/src/demo'

/**
 * 문서 페이지 slug(`<category>/<package>`) → 데모 컴포넌트.
 * 데모는 공개 API가 아니므로 패키지 src를 상대 경로로 직접 import한다.
 */
const demos: Record<string, ComponentType> = {
  'dom/highlight-kit': HighlightDemo,
  'dom/scope-style': ScopeStyleDemo,
  'react/pagination': PaginationDemo,
}

/** 등록된 데모가 있으면 제목과 함께 렌더하고, 없으면 아무것도 렌더하지 않는다. */
export function Demo({ slug }: { slug: string }) {
  const Component = demos[slug]
  if (!Component) return null
  return (
    <>
      <h2 id="demo">데모</h2>
      <div className="not-prose overflow-hidden rounded-xl border bg-fd-card">
        <Component />
      </div>
    </>
  )
}
