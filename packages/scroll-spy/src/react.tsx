import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import type { ScrollSpyInstance, ScrollSpyOptions } from './types'
import { createScrollSpy, supportsScrollTargetGroup } from './scroll-spy'

export interface UseScrollSpyOptions extends Omit<
  ScrollSpyOptions,
  'onChange'
> {
  /** Enable/disable the scroll spy (default: true) */
  enabled?: boolean
}

export interface UseScrollSpyReturn {
  /** Ref to attach to navigation container */
  navRef: RefObject<HTMLElement | null>
  /** Currently active section ID */
  currentId: string | null
  /** Whether using native CSS scroll-target-group */
  isNative: boolean
  /** Manually set active section */
  setActive: (id: string) => void
  /** Refresh observer (call after DOM changes) */
  refresh: () => void
}

export function useScrollSpy(
  options: UseScrollSpyOptions = {},
): UseScrollSpyReturn {
  const {
    enabled = true,
    root,
    rootMargin,
    threshold,
    activeClass,
    currentAttribute,
  } = options

  const navRef = useRef<HTMLElement>(null)
  const instanceRef = useRef<ScrollSpyInstance | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [isNative, setIsNative] = useState(() => supportsScrollTargetGroup())

  useEffect(() => {
    if (!enabled || !navRef.current) {
      instanceRef.current?.destroy()
      instanceRef.current = null
      return
    }

    const instance = createScrollSpy(navRef.current, {
      root,
      rootMargin,
      threshold,
      activeClass,
      currentAttribute,
      onChange: (id) => setCurrentId(id),
    })

    instanceRef.current = instance
    setIsNative(instance.isNative)

    return () => {
      instance.destroy()
      instanceRef.current = null
    }
  }, [enabled, root, rootMargin, threshold, activeClass, currentAttribute])

  const setActive = useCallback((id: string) => {
    instanceRef.current?.setActive(id)
  }, [])

  const refresh = useCallback(() => {
    instanceRef.current?.refresh()
  }, [])

  return { navRef, currentId, isNative, setActive, refresh }
}

export interface Heading {
  id: string
  text: string
  level: number
  element: Element
}

export interface UseScrollSpyHeadingsOptions extends UseScrollSpyOptions {
  /** CSS selector for headings (default: 'h2, h3') */
  selector?: string
  /** Container element or ref */
  container?: HTMLElement | RefObject<HTMLElement | null> | null
}

export interface UseScrollSpyHeadingsReturn extends UseScrollSpyReturn {
  /** Detected headings */
  headings: Heading[]
}

export function useScrollSpyHeadings(
  options: UseScrollSpyHeadingsOptions = {},
): UseScrollSpyHeadingsReturn {
  const { selector = 'h2, h3', container, ...scrollSpyOptions } = options

  const [headings, setHeadings] = useState<Heading[]>([])
  const scrollSpy = useScrollSpy(scrollSpyOptions)
  const { refresh } = scrollSpy

  useEffect(() => {
    const containerEl = container
      ? 'current' in container
        ? container.current
        : container
      : document.body

    if (!containerEl) return

    const elements = containerEl.querySelectorAll(selector)
    const newHeadings: Heading[] = []
    let idCounter = 0

    elements.forEach((el) => {
      if (!el.id) {
        const text =
          el.textContent
            ?.trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || `section-${idCounter++}`
        el.id = text
      }

      newHeadings.push({
        id: el.id,
        text: el.textContent?.trim() || '',
        level: parseInt(el.tagName[1] ?? '2', 10),
        element: el,
      })
    })

    setHeadings(newHeadings)
  }, [selector, container])

  useEffect(() => {
    if (headings.length > 0) {
      const timer = setTimeout(() => refresh(), 0)
      return () => clearTimeout(timer)
    }
  }, [headings, refresh])

  return { ...scrollSpy, headings }
}

/**
 * Check if native CSS `scroll-target-group` is supported (SSR-safe).
 */
export function useIsNativeScrollSpy(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => supportsScrollTargetGroup(),
    () => false,
  )
}

export interface UseSmoothScrollOptions {
  /** Scroll behavior (default: 'smooth') */
  behavior?: ScrollBehavior
  /** Block alignment (default: 'start') */
  block?: ScrollLogicalPosition
  /** Inline alignment (default: 'nearest') */
  inline?: ScrollLogicalPosition
  /** Offset from top in pixels (default: 0) */
  offset?: number
}

export interface UseSmoothScrollReturn {
  scrollTo: (id: string) => void
  handleClick: (e: MouseEvent<HTMLAnchorElement>) => void
}

export function useSmoothScroll(
  options: UseSmoothScrollOptions = {},
): UseSmoothScrollReturn {
  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    offset = 0,
  } = options

  const scrollTo = useCallback(
    (id: string) => {
      const element = document.getElementById(id)
      if (!element) return

      if (offset === 0) {
        element.scrollIntoView({ behavior, block, inline })
      } else {
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - offset
        window.scrollTo({ top: offsetPosition, behavior })
      }

      history.pushState(null, '', `#${id}`)
    },
    [behavior, block, inline, offset],
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      const href = e.currentTarget.getAttribute('href')
      if (href?.startsWith('#')) {
        e.preventDefault()
        scrollTo(href.slice(1))
      }
    },
    [scrollTo],
  )

  return { scrollTo, handleClick }
}

export interface ScrollSpyNavProps extends HTMLAttributes<HTMLElement> {
  /** Headings to render */
  headings: Heading[]
  /** Currently active ID */
  currentId: string | null
  /** Active class name */
  activeClass?: string
  /** Click handler for smooth scroll */
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  /** Render a custom link */
  renderLink?: (heading: Heading, isActive: boolean) => ReactNode
  /** Tag for the navigation element */
  as?: 'nav' | 'div' | 'aside'
  /** Ref to the navigation element */
  ref?: Ref<HTMLElement>
}

export function ScrollSpyNav({
  headings,
  currentId,
  activeClass = 'active',
  onLinkClick,
  renderLink,
  as: Tag = 'nav',
  className,
  ref,
  ...props
}: ScrollSpyNavProps): ReactNode {
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      className={`scroll-spy-nav ${className || ''}`}
      {...props}
    >
      <ul className="scroll-spy-list">
        {headings.map((heading) => {
          const isActive = heading.id === currentId

          return (
            <li
              key={heading.id}
              className="scroll-spy-item"
              data-level={heading.level}
            >
              {renderLink ? (
                renderLink(heading, isActive)
              ) : (
                <a
                  href={`#${heading.id}`}
                  className={`scroll-spy-link ${isActive ? activeClass : ''}`}
                  onClick={onLinkClick}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {heading.text}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </Tag>
  )
}

export interface ScrollSpyRenderProps {
  headings: Heading[]
  currentId: string | null
  isNative: boolean
  navRef: RefObject<HTMLElement | null>
}

export interface ScrollSpyProps {
  /** CSS selector for headings */
  selector?: string
  /** Container for headings */
  container?: HTMLElement | RefObject<HTMLElement | null> | null
  /** ScrollSpy options */
  options?: UseScrollSpyOptions
  /** Smooth scroll options */
  smoothScrollOptions?: UseSmoothScrollOptions
  /** Custom className */
  className?: string
  /** Custom styles */
  style?: CSSProperties
  /** Render a custom link */
  renderLink?: ScrollSpyNavProps['renderLink']
  /** Children render prop */
  children?: (props: ScrollSpyRenderProps) => ReactNode
}

export function ScrollSpy({
  selector,
  container,
  options,
  smoothScrollOptions,
  className,
  style,
  renderLink,
  children,
}: ScrollSpyProps): ReactNode {
  const { headings, currentId, isNative, navRef } = useScrollSpyHeadings({
    selector,
    container,
    ...options,
  })

  const { handleClick } = useSmoothScroll(smoothScrollOptions)

  if (children) {
    return <>{children({ headings, currentId, isNative, navRef })}</>
  }

  return (
    <ScrollSpyNav
      ref={navRef}
      headings={headings}
      currentId={currentId}
      onLinkClick={handleClick}
      renderLink={renderLink}
      className={className}
      style={style}
    />
  )
}

export { createScrollSpy, supportsScrollTargetGroup } from './scroll-spy'
export { generateToc, generateStyles } from './toc'
export type { ScrollSpyOptions, ScrollSpyInstance, TocOptions } from './types'
