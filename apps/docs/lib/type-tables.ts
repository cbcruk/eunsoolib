import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '../..')

export interface TypeTableEntry {
  /** 저장소 루트 기준 파일 경로 */
  file: string
  /** export된 interface / type 이름 */
  name: string
}

/** 문서 페이지 slug → 자동 생성할 타입 표 */
export const typeTables: Record<string, TypeTableEntry[]> = {
  'dom/highlight-kit': [
    {
      file: 'packages/highlight-kit/src/react.tsx',
      name: 'UseHighlightOptions',
    },
    {
      file: 'packages/highlight-kit/src/react.tsx',
      name: 'UseHighlightSearchOptions',
    },
    { file: 'packages/highlight-kit/src/core.ts', name: 'HighlightSink' },
  ],
  'react/pagination': [
    { file: 'packages/pagination/src/types.ts', name: 'UsePaginationOptions' },
  ],
}

export function resolveFromRoot(file: string): string {
  return path.join(repoRoot, file)
}
