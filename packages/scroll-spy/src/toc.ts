import type { TocOptions } from './types'

function slugify(text: string, fallback: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  )
}

/**
 * Auto-generate a table-of-contents `<nav>` from headings in a container.
 * Headings without an `id` get one derived from their text.
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

  let idCounter = 0

  for (const heading of headings) {
    if (!heading.id) {
      heading.id = slugify(heading.textContent ?? '', `section-${idCounter++}`)
    }

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

export interface GenerateStylesOptions {
  activeClass?: string
  activeColor?: string
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
