import type { ScrollSpyOptions, ScrollSpyInstance } from './types'

/**
 * Check if the browser supports the native CSS `scroll-target-group`.
 */
export function supportsScrollTargetGroup(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  return CSS.supports('scroll-target-group', 'auto')
}

const STYLE_ID = '__scroll-spy-native-styles__'

function injectNativeStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [data-scroll-spy-nav] {
      scroll-target-group: auto;
    }
  `
  document.head.appendChild(style)
}

/**
 * Create a scroll-spy instance with progressive enhancement.
 *
 * Uses native CSS `scroll-target-group` + `:target-current` when supported
 * (Chrome 140+), otherwise falls back to `IntersectionObserver`.
 */
export function createScrollSpy(
  navContainer: HTMLElement,
  options: ScrollSpyOptions = {},
): ScrollSpyInstance {
  const {
    root = null,
    rootMargin = '0px 0px -50% 0px',
    threshold = 0,
    activeClass = 'active',
    currentAttribute = 'data-current',
    onChange,
  } = options

  let currentId: string | null = null
  let observer: IntersectionObserver | null = null
  const isNative = supportsScrollTargetGroup()

  const getLinks = (): HTMLAnchorElement[] => {
    return Array.from(navContainer.querySelectorAll('a[href^="#"]'))
  }

  const getTargets = (): Map<string, Element> => {
    const targets = new Map<string, Element>()
    for (const link of getLinks()) {
      const id = link.getAttribute('href')?.slice(1)
      if (id) {
        const target = document.getElementById(id)
        if (target) targets.set(id, target)
      }
    }
    return targets
  }

  const setActive = (id: string | null): void => {
    if (id === currentId) return

    const links = getLinks()

    for (const link of links) {
      link.classList.remove(activeClass)
      link.removeAttribute(currentAttribute)
    }

    if (id) {
      const activeLink = links.find((l) => l.getAttribute('href') === `#${id}`)
      if (activeLink) {
        activeLink.classList.add(activeClass)
        activeLink.setAttribute(currentAttribute, '')
      }
    }

    const prevId = currentId
    currentId = id

    if (prevId !== id) {
      const element = id ? document.getElementById(id) : null
      onChange?.(id, element)
    }
  }

  if (isNative) {
    injectNativeStyles()
    navContainer.setAttribute('data-scroll-spy-nav', '')

    let rafId: number | null = null
    const syncCurrent = (): void => {
      const currentLink = navContainer.querySelector(
        'a:target-current',
      ) as HTMLAnchorElement | null
      const id = currentLink?.getAttribute('href')?.slice(1) ?? null
      setActive(id)
    }

    const handleScroll = (): void => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        syncCurrent()
      })
    }

    const scrollContainer: Element | Window = root ?? window
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    requestAnimationFrame(handleScroll)

    return {
      get currentId() {
        return currentId
      },
      get isNative() {
        return true
      },
      setActive: (id: string) => {
        const link = getLinks().find((l) => l.getAttribute('href') === `#${id}`)
        link?.click()
      },
      refresh: () => handleScroll(),
      destroy: () => {
        scrollContainer.removeEventListener('scroll', handleScroll)
        navContainer.removeAttribute('data-scroll-spy-nav')
        if (rafId) cancelAnimationFrame(rafId)
      },
    }
  }

  const visibleSections = new Map<string, IntersectionObserverEntry>()

  const updateActive = (): void => {
    let topmost: { id: string; top: number } | null = null

    for (const [id, entry] of visibleSections) {
      if (entry.isIntersecting) {
        const top = entry.boundingClientRect.top
        if (!topmost || top < topmost.top) {
          topmost = { id, top }
        }
      }
    }

    setActive(topmost?.id ?? null)
  }

  const handleIntersect: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      const id = entry.target.id
      if (entry.isIntersecting) {
        visibleSections.set(id, entry)
      } else {
        visibleSections.delete(id)
      }
    }
    updateActive()
  }

  const setupObserver = (): void => {
    observer?.disconnect()
    visibleSections.clear()

    observer = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin,
      threshold,
    })

    for (const [, target] of getTargets()) {
      observer.observe(target)
    }
  }

  setupObserver()

  return {
    get currentId() {
      return currentId
    },
    get isNative() {
      return false
    },
    setActive: (id: string) => setActive(id),
    refresh: () => setupObserver(),
    destroy: () => {
      observer?.disconnect()
      observer = null
      visibleSections.clear()
      for (const link of getLinks()) {
        link.classList.remove(activeClass)
        link.removeAttribute(currentAttribute)
      }
    },
  }
}
