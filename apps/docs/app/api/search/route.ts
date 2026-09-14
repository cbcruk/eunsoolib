import { createFromSource } from 'fumadocs-core/search/server'
import { source } from '@/lib/source'

// 정적 export: 빌드 시 인덱스를 JSON으로 내보내고 브라우저에서 검색한다.
export const revalidate = false

export const { staticGET: GET } = createFromSource(source)
