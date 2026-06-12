import { useMemo, useState, type ReactNode } from 'react'
import { Pagination } from './pagination'
import { usePagination } from './use-pagination'
import { DOTS } from './pagination.utils'

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
}

const CATEGORIES = ['전자기기', '의류', '식품', '도서']

const MOCK_DATA: Product[] = Array.from({ length: 247 }, (_, i) => ({
  id: i + 1,
  name: `상품 ${String(i + 1).padStart(3, '0')}`,
  category: CATEGORIES[i % 4]!,
  price: (Math.floor(Math.random() * 90) + 10) * 1000,
  stock: Math.floor(Math.random() * 200),
}))

/**
 * 하나의 pagination 인스턴스를 테이블 위·아래 두 Pagination이 공유하는 데모.
 * Provider 없이 props만으로 동기화된다.
 */
export default function App(): ReactNode {
  const pagination = usePagination({
    total: MOCK_DATA.length,
    initialPageSize: 8,
    siblingCount: 1,
  })

  const pageData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return MOCK_DATA.slice(start, start + pagination.pageSize)
  }, [pagination.page, pagination.pageSize])

  const [jumpInput, setJumpInput] = useState('')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf8f5',
        padding: '2rem 1.5rem',
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        button:hover:not(:disabled) { filter: brightness(0.97); }
        tbody tr { transition: background 0.15s ease; }
        tbody tr:hover { background: #fdfbf7 !important; }
        input:focus { outline: none; border-color: #d97706 !important; }
      `}</style>

      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              marginBottom: '0.75rem',
            }}
          >
            INSTANCE HOOK PATTERN
          </span>
          <h1
            style={{
              margin: '0 0 0.4rem',
              fontSize: '2rem',
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              color: '#1c1917',
            }}
          >
            상품 목록
          </h1>
          <p style={{ color: '#78716c', margin: 0, fontSize: '0.95rem' }}>
            하나의{' '}
            <code
              style={{
                background: '#f5f0e8',
                padding: '0.1rem 0.4rem',
                borderRadius: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              pagination
            </code>{' '}
            인스턴스를 테이블 위·아래 두 컴포넌트가 공유합니다. Provider 없이
            props만으로 동기화됩니다.
          </p>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
            border: '1px solid #f0ebe3',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              paddingBottom: '1rem',
              marginBottom: '1rem',
              borderBottom: '1px solid #f0ebe3',
            }}
          >
            <Pagination pagination={pagination} size="sm" showInfo />
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.setPageSize(Number(e.target.value))}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                fontSize: '0.75rem',
                color: '#374151',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: 'white',
              }}
            >
              {[5, 8, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}개씩
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: '#a8a29e' }}>
                  {['ID', '상품명', '카테고리', '가격', '재고'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.6rem 0.75rem',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid #f0ebe3',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid #f7f3ee' }}
                  >
                    <td
                      style={{
                        padding: '0.7rem 0.75rem',
                        color: '#a8a29e',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(row.id).padStart(3, '0')}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 0.75rem',
                        fontWeight: 500,
                        color: '#1c1917',
                      }}
                    >
                      {row.name}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          background: '#f5f0e8',
                          color: '#92400e',
                        }}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 0.75rem',
                        color: '#44403c',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ₩{row.price.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 0.75rem',
                        color: row.stock < 20 ? '#dc2626' : '#16a34a',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {row.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              paddingTop: '1.25rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #f0ebe3',
            }}
          >
            <Pagination pagination={pagination} />

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                type="number"
                placeholder="페이지"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && jumpInput) {
                    pagination.goTo(Number(jumpInput))
                    setJumpInput('')
                  }
                }}
                style={{
                  width: '4.5rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => {
                  if (jumpInput) {
                    pagination.goTo(Number(jumpInput))
                    setJumpInput('')
                  }
                }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#1c1917',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                이동
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: '#1c1917',
            borderRadius: '0.75rem',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: '#a8a29e',
              marginBottom: '0.75rem',
              fontFamily: 'monospace',
            }}
          >
            // 외부에서 인스턴스 상태에 직접 접근
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: '0.78rem',
              color: '#e7e5e4',
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.7,
            }}
          >{`pagination.page        // ${pagination.page}
pagination.totalPages  // ${pagination.totalPages}
pagination.range       // { start: ${pagination.range.start}, end: ${pagination.range.end} }
pagination.items       // [${pagination.items
            .map((i) => (i === DOTS ? '"…"' : i))
            .join(', ')}]
pagination.isLast      // ${pagination.isLast}`}</pre>
        </div>
      </div>
    </div>
  )
}
