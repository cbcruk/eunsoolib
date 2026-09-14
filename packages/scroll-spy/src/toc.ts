import type { TocOptions } from './types'
import { createHeadingIdAssigner } from './heading-id'

/**
 * Auto-generate a table-of-contents `<nav>` from headings in a container.
 *
 * Headings without an `id` get one derived from their text: letters and digits
 * of any script are kept (`Getting Started` → `getting-started`, non-Latin text
 * stays as text), and a slug already used in the document gets a `-2`, `-3`,
 * … suffix. Text with no letters or digits falls back to `section`.
 */
export function generateToc(options: TocOptions = {}): HTMLElement {
  const {
    container = document.body,
    levels = ['h2', 'h3'],
    listType = 'ul',
    navClass = 'scroll-spy-nav',
    listClass = 'scroll-spy-list',
    itemClass = 'scroll-spy-item',
    linkClass = 'scroll-spy-link',
  } = options

  const headings = container.querySelectorAll(levels.join(', '))

  const nav = document.createElement('nav')
  nav.className = navClass

  const list = document.createElement(listType)
  list.className = listClass

  const assignId = createHeadingIdAssigner(container)

  for (const heading of headings) {
    assignId(heading)

    const item = document.createElement('li')
    item.className = itemClass
    item.setAttribute('data-level', heading.tagName.toLowerCase())

    const link = document.createElement('a')
    link.className = linkClass
    link.href = `#${heading.id}`
    link.textContent = heading.textContent

    item.appendChild(link)
    list.appendChild(item)
  }

  nav.appendChild(list)
  return nav
}

/** Options for {@link generateStyles}. */
export interface GenerateStylesOptions {
  /** Class applied to the active link. @default 'active' */
  activeClass?: string
  /** CSS color value for the active link. @default 'var(--scroll-spy-active-color, #3b82f6)' */
  activeColor?: string
  /** CSS duration for the link color transition. @default '0.2s' */
  transitionDuration?: string
}

/**
 * Generate CSS for scroll-spy with progressive enhancement.
 * The same `.active` class and `:target-current` selector cover both the
 * fallback and the native CSS path.
 */
export function generateStyles(options: GenerateStylesOptions = {}): string {
  const {
    activeClass = 'active',
    activeColor = 'var(--scroll-spy-active-color, #3b82f6)',
    transitionDuration = '0.2s',
  } = options

  return `
.scroll-spy-nav {
  scroll-target-group: auto;
}

.scroll-spy-link {
  transition: color ${transitionDuration} ease;
}

.scroll-spy-link.${activeClass},
.scroll-spy-link:target-current {
  color: ${activeColor};
}
`.trim()
}
