/**
 * CSS Custom Highlight API 지원 여부. jsdom/SSR에서는 false.
 */
export function isSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof window !== 'undefined' &&
    typeof window.Highlight === 'function'
  )
}
