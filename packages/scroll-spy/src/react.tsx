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

/** Options for {@link useScrollSpy}: the `createScrollSpy` options except `onChange`. */
export interface UseScrollSpyOptions extends Omit<
  ScrollSpyOptions,
  'onChange'
> {
  /** Enable/disable the scroll spy. @default true */
  enabled?: boolean
}

/** Value returned by {@link useScrollSpy}. */
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

/**
 * Attach a scroll spy (see `createScrollSpy`) to the element in `navRef` and track the active section ID.
 *
 * The instance is created after mount and recreated when any option changes.
 *
 * @example
 * ```tsx
 * import { useScrollSpy } from '@cbcruk/scroll-spy/react'
 *
 * function Toc() {
 *   const { navRef, currentId } = useScrollSpy({ activeClass: 'active' })
 *
 *   return (
 *     <nav ref={navRef}>
 *       <a href="#intro">Intro</a>
 *       <a href="#usage">Usage</a>
 *       <p>Viewing: {currentId}</p>
 *     </nav>
 *   )
 * }
 * ```
 */
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

/** A heading detected by {@link useScrollSpyHeadings}. */
export interface Heading {
  /** Element `id`, generated from the text when the heading had none. */
  id: string
  /** Trimmed text content. */
  text: string
  /** Heading level parsed from the tag name (e.g. `2` for `h2`). */
  level: number
  /** The heading element. */
  element: Element
}

/** Options for {@link useScrollSpyHeadings}. */
export interface UseScrollSpyHeadingsOptions extends UseScrollSpyOptions {
  /** CSS selector for headings. @default 'h2, h3' */
  selector?: string
  /** Container element or ref. Falls back to `document.body` when omitted. */
  container?: HTMLElement | RefObject<HTMLElement | null> | null
}

/** Value returned by {@link useScrollSpyHeadings}. */
export interface UseScrollSpyHeadingsReturn extends UseScrollSpyReturn {
  /** Detected headings */
  headings: Heading[]
}

/**
 * Collect headings from a container and track the active one with {@link useScrollSpy}.
 *
 * Headings without an `id` get a slug derived from their text (or
 * `section-<n>` when the text yields no slug). Headings are collected after
 * mount and again when `selector` or `container` changes, and the scroll spy is
 * refreshed once headings are found.
 *
 * @example
 * ```tsx
 * import { useScrollSpyHeadings, ScrollSpyNav } from '@cbcruk/scroll-spy/react'
 *
 * function Toc() {
 *   const { headings, currentId, navRef } = useScrollSpyHeadings({
 *     selector: 'h2, h3',
 *   })
 *
 *   return <ScrollSpyNav ref={navRef} headings={headings} currentId={currentId} />
 * }
 * ```
 */
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

/** Options for {@link useSmoothScroll}. */
export interface UseSmoothScrollOptions {
  /** Scroll behavior. @default 'smooth' */
  behavior?: ScrollBehavior
  /** Block alignment, used only when `offset` is `0`. @default 'start' */
  block?: ScrollLogicalPosition
  /** Inline alignment, used only when `offset` is `0`. @default 'nearest' */
  inline?: ScrollLogicalPosition
  /** Offset from top in pixels. A non-zero value scrolls `window` instead of using `scrollIntoView`. @default 0 */
  offset?: number
}

/** Value returned by {@link useSmoothScroll}. */
export interface UseSmoothScrollReturn {
  /** Scroll to the element with this ID and push `#id` to history. Does nothing if the element is missing. */
  scrollTo: (id: string) => void
  /** Anchor click handler that prevents default and calls `scrollTo` for `#` hrefs. */
  handleClick: (e: MouseEvent<HTMLAnchorElement>) => void
}

/**
 * Smoothly scroll to in-page sections, with an optional top offset.
 *
 * @example
 * ```tsx
 * import { useSmoothScroll } from '@cbcruk/scroll-spy/react'
 *
 * function Link() {
 *   const { handleClick } = useSmoothScroll({ offset: 80 })
 *
 *   return <a href="#usage" onClick={handleClick}>Usage</a>
 * }
 * ```
 */
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

/** Props for {@link ScrollSpyNav}. Other HTML attributes are passed to the navigation element. */
export interface ScrollSpyNavProps extends HTMLAttributes<HTMLElement> {
  /** Headings to render */
  headings: Heading[]
  /** Currently active ID */
  currentId: string | null
  /** Active class name. @default 'active' */
  activeClass?: string
  /** Click handler for smooth scroll */
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  /** Render a custom link instead of the default `<a>`. */
  renderLink?: (heading: Heading, isActive: boolean) => ReactNode
  /** Tag for the navigation element. @default 'nav' */
  as?: 'nav' | 'div' | 'aside'
  /** Ref to the navigation element */
  ref?: Ref<HTMLElement>
}

/**
 * Render headings as a list of anchor links with the active one marked.
 *
 * The active link gets `activeClass` and `aria-current="location"`. Each item
 * carries `data-level` with the heading level.
 */
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

/** Values passed to the {@link ScrollSpy} `children` render prop. */
export interface ScrollSpyRenderProps {
  /** Detected headings. */
  headings: Heading[]
  /** Currently active section ID. */
  currentId: string | null
  /** Whether using native CSS scroll-target-group. */
  isNative: boolean
  /** Ref to attach to the navigation container. */
  navRef: RefObject<HTMLElement | null>
}

/** Props for {@link ScrollSpy}. */
export interface ScrollSpyProps {
  /** CSS selector for headings. @default 'h2, h3' */
  selector?: string
  /** Container for headings. Falls back to `document.body` when omitted. */
  container?: HTMLElement | RefObject<HTMLElement | null> | null
  /** ScrollSpy options */
  options?: UseScrollSpyOptions
  /** Smooth scroll options */
  smoothScrollOptions?: UseSmoothScrollOptions
  /** Custom className for the default navigation. */
  className?: string
  /** Custom styles for the default navigation. */
  style?: CSSProperties
  /** Render a custom link */
  renderLink?: ScrollSpyNavProps['renderLink']
  /** Children render prop. When given, it replaces the default navigation. */
  children?: (props: ScrollSpyRenderProps) => ReactNode
}

/**
 * Build a table of contents from page headings with scroll spy and smooth scrolling.
 *
 * Renders {@link ScrollSpyNav} by default, or calls `children` with the render
 * props so you can render your own navigation (attach `navRef` to it).
 *
 * @example
 * ```tsx
 * import { ScrollSpy } from '@cbcruk/scroll-spy/react'
 *
 * function Toc() {
 *   return <ScrollSpy selector="h2, h3" smoothScrollOptions={{ offset: 80 }} />
 * }
 * ```
 */
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
