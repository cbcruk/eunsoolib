import {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react'
import { useHighlight } from './highlight-context'
import { useTextMatches } from './use-highlight-search'
import type { TextMatchOptions } from './types'

interface HighlightContextValue {
  name: string
  containerRef: RefObject<HTMLElement | null>
}

const HighlightCtx = createContext<HighlightContextValue | null>(null)

function useHighlightCtx(who: string): HighlightContextValue {
  const ctx = useContext(HighlightCtx)
  if (!ctx) throw new Error(`<${who}> must be used inside <Highlight.Root>`)
  return ctx
}

export interface HighlightRootProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  /** Match가 name을 생략했을 때 사용하는 기본 하이라이트 이름. */
  name: string
  as?: ElementType
  children?: ReactNode
}

export const HighlightRoot = forwardRef<HTMLElement, HighlightRootProps>(
  function HighlightRoot({ name, as, className, children, ...rest }, ref) {
    const Tag = (as ?? 'div') as ElementType
    const innerRef = useRef<HTMLElement | null>(null)
    useImperativeHandle(ref, () => innerRef.current as HTMLElement)
    const ctx = useMemo<HighlightContextValue>(
      () => ({ name, containerRef: innerRef }),
      [name],
    )
    return (
      <HighlightCtx.Provider value={ctx}>
        <Tag ref={innerRef} className={className} {...rest}>
          {children}
        </Tag>
      </HighlightCtx.Provider>
    )
  },
)

export interface HighlightMatchProps extends TextMatchOptions {
  pattern: string | RegExp
  /** 생략하면 Root의 name을 사용한다. */
  name?: string
  priority?: number
}

/**
 * effect-only 컴포넌트. children을 렌더하지 않고 Root의 containerRef를 스캔해
 * 매치를 하이라이트한다.
 */
export function HighlightMatch({
  pattern,
  caseSensitive,
  wholeWord,
  name,
  priority,
}: HighlightMatchProps): null {
  const ctx = useHighlightCtx('Highlight.Match')
  const ranges = useTextMatches(ctx.containerRef, pattern, {
    caseSensitive,
    wholeWord,
  })
  useHighlight(name ?? ctx.name, ranges, priority ?? 0)
  return null
}

export const Highlight = {
  Root: HighlightRoot,
  Match: HighlightMatch,
}
