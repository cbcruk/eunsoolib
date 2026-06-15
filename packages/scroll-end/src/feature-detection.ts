/**
 * Check whether the native `scrollend` event is supported.
 * Returns `false` during SSR.
 */
export function isScrollEndSupported(): boolean {
  return typeof window !== 'undefined' && 'onscrollend' in window
}
