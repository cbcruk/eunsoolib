import { useEffect, useRef, useState, type RefObject } from 'react'

export interface UseActiveSectionOptions {
  /** Sticky offset (px) used as the activation line. @default 0 */
  offset?: number
}

export interface UseActiveSectionReturn {
  /** The currently stuck section, recomputed on `scrollend`. */
  activeSection: HTMLElement | null
}

/**
 * Track which sticky section header is currently active (stuck) among several.
 *
 * The active section is the last one whose top has reached the activation line.
 * Recomputed once per `scrollend`, so there is no flicker during scroll.
 */
export function useActiveSection(
  sectionRefs: RefObject<HTMLElement | null>[],
  { offset = 0 }: UseActiveSectionOptions = {},
): UseActiveSectionReturn {
  const [activeSection, setActiveSection] = useState<HTMLElement | null>(null)

  const refsRef = useRef(sectionRefs)
  refsRef.current = sectionRefs
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  useEffect(() => {
    const computeActive = (): void => {
      let active: HTMLElement | null = null

      for (const ref of refsRef.current) {
        const element = ref.current
        if (!element) continue
        if (element.getBoundingClientRect().top <= offsetRef.current) {
          active = element
        }
      }

      setActiveSection(active)
    }

    computeActive()
    document.addEventListener('scrollend', computeActive)
    return () => document.removeEventListener('scrollend', computeActive)
  }, [])

  return { activeSection }
}
