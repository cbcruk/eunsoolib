export interface ScrollSpyOptions {
  /** Root element for intersection observation (default: null = viewport) */
  root?: Element | null
  /** Margin around root (default: "0px 0px -50% 0px" - trigger at 50% viewport) */
  rootMargin?: string
  /** Intersection threshold (default: 0) */
  threshold?: number | number[]
  /** CSS class for active link (default: "active") */
  activeClass?: string
  /** Attribute to mark current target (default: "data-current") */
  currentAttribute?: string
  /** Callback when active section changes */
  onChange?: (id: string | null, element: Element | null) => void
}

export interface ScrollSpyInstance {
  /** Currently active section ID */
  readonly currentId: string | null
  /** Whether using native CSS scroll-target-group */
  readonly isNative: boolean
  /** Manually set active section */
  setActive: (id: string) => void
  /** Refresh observer (call after DOM changes) */
  refresh: () => void
  /** Cleanup and destroy instance */
  destroy: () => void
}

export interface TocOptions {
  /** Container to scan for headings (default: document.body) */
  container?: HTMLElement
  /** Heading levels to include (default: ['h2', 'h3']) */
  levels?: string[]
  /** List type (default: 'ul') */
  listType?: 'ul' | 'ol'
  /** CSS class for the nav element */
  navClass?: string
  /** CSS class for the list element */
  listClass?: string
  /** CSS class for list items */
  itemClass?: string
  /** CSS class for links */
  linkClass?: string
}
