/** Options for `createScrollSpy`. */
export interface ScrollSpyOptions {
  /**
   * Root element for intersection observation; `null` means the viewport.
   * In native mode, scroll events are listened to on this element (or `window`).
   *
   * @default null
   */
  root?: Element | null
  /**
   * Margin around root, used by the `IntersectionObserver` fallback. The default
   * triggers at 50% of the viewport.
   *
   * @default '0px 0px -50% 0px'
   */
  rootMargin?: string
  /** Intersection threshold, used by the `IntersectionObserver` fallback. @default 0 */
  threshold?: number | number[]
  /** CSS class for active link. @default 'active' */
  activeClass?: string
  /** Attribute set (with an empty value) on the active link. @default 'data-current' */
  currentAttribute?: string
  /** Callback when active section changes; `id` and `element` are `null` when none is active. */
  onChange?: (id: string | null, element: Element | null) => void
}

/** Handle returned by `createScrollSpy`. */
export interface ScrollSpyInstance {
  /** Currently active section ID */
  readonly currentId: string | null
  /** Whether using native CSS scroll-target-group */
  readonly isNative: boolean
  /**
   * Manually set active section.
   *
   * In native mode this clicks the matching link, so the browser navigates to it.
   */
  setActive: (id: string) => void
  /** Refresh observer (call after DOM changes) */
  refresh: () => void
  /** Cleanup and destroy instance */
  destroy: () => void
}

/** Options for `generateToc`. */
export interface TocOptions {
  /** Container to scan for headings. @default document.body */
  container?: HTMLElement
  /** Heading tag selectors to include. @default ['h2', 'h3'] */
  levels?: string[]
  /** List type. @default 'ul' */
  listType?: 'ul' | 'ol'
  /** CSS class for the nav element. @default 'scroll-spy-nav' */
  navClass?: string
  /** CSS class for the list element. @default 'scroll-spy-list' */
  listClass?: string
  /** CSS class for list items. @default 'scroll-spy-item' */
  itemClass?: string
  /** CSS class for links. @default 'scroll-spy-link' */
  linkClass?: string
}
