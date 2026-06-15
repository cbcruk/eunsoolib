import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { useRef, type ReactNode, type RefObject } from 'react'
import { useActiveSection } from './use-active-section'

afterEach(cleanup)

function setTop(element: HTMLElement, top: number): void {
  element.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + 10,
      left: 0,
      right: 0,
      width: 0,
      height: 10,
      x: 0,
      y: top,
    }) as DOMRect
}

interface HarnessProps {
  tops: number[]
}

function Harness({ tops }: HarnessProps): ReactNode {
  const refs = tops.map(() => useRef<HTMLElement>(null))
  const { activeSection } = useActiveSection(
    refs as RefObject<HTMLElement | null>[],
  )

  return (
    <div>
      <span data-testid="active">{activeSection?.dataset.name ?? 'none'}</span>
      {tops.map((top, i) => (
        <section
          key={i}
          data-name={`s${i}`}
          ref={(node) => {
            refs[i]!.current = node
            if (node) setTop(node, top)
          }}
        />
      ))}
    </div>
  )
}

describe('useActiveSection', () => {
  it('top이 활성선(0)을 지난 마지막 섹션을 활성으로 판정해야 함', () => {
    // s0, s1은 위로 지나갔고(top<=0) s2는 아직 아래(top>0) → 활성은 s1
    render(<Harness tops={[-100, -20, 50]} />)

    act(() => {
      document.dispatchEvent(new Event('scrollend'))
    })

    expect(screen.getByTestId('active').textContent).toBe('s1')
  })

  it('아무 섹션도 활성선을 지나지 않았으면 null이어야 함', () => {
    render(<Harness tops={[30, 60, 90]} />)

    act(() => {
      document.dispatchEvent(new Event('scrollend'))
    })

    expect(screen.getByTestId('active').textContent).toBe('none')
  })
})
