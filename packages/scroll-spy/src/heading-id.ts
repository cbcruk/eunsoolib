/**
 * Turn heading text into an id slug. Letters, marks and digits of any script
 * are kept, so non-Latin headings keep their text; every other run becomes `-`.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Create a function that assigns a unique id to each heading without one.
 *
 * Ids already present in `container` or its document count as taken; a
 * repeated slug gets a `-2`, `-3`, … suffix. Text that yields an empty slug
 * falls back to `section`.
 */
export function createHeadingIdAssigner(
  container: ParentNode & Node,
): (heading: Element) => string {
  const used = new Set<string>()
  for (const el of container.querySelectorAll('[id]')) used.add(el.id)
  const doc = container.ownerDocument ?? (container as Document)

  const isTaken = (id: string): boolean =>
    used.has(id) || doc.getElementById?.(id) != null

  return (heading) => {
    if (heading.id) return heading.id
    const base = slugify(heading.textContent ?? '') || 'section'
    let id = base
    for (let n = 2; isTaken(id); n++) id = `${base}-${n}`
    used.add(id)
    heading.id = id
    return id
  }
}
