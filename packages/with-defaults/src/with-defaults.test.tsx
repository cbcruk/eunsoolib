import { createRef, type Ref } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { withDefaults } from './with-defaults'

type ButtonProps = {
  styleType: 'primary' | 'danger'
  size: 'small' | 'medium'
  label: string
}

function Button({ styleType, size, label }: ButtonProps) {
  return (
    <button data-style={styleType} data-size={size}>
      {label}
    </button>
  )
}

describe('withDefaults', () => {
  test('기본값을 준 prop을 생략하면 defaults가 렌더링에 반영된다', () => {
    const Submit = withDefaults(Button, {
      styleType: 'primary',
      size: 'medium',
    })

    render(<Submit label="저장" />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-style', 'primary')
    expect(button).toHaveAttribute('data-size', 'medium')
    expect(button).toHaveTextContent('저장')
  })

  test('호출부에서 넘긴 prop이 defaults를 덮어쓴다', () => {
    const Submit = withDefaults(Button, {
      styleType: 'primary',
      size: 'medium',
    })

    render(<Submit label="삭제" styleType="danger" />)

    expect(screen.getByRole('button')).toHaveAttribute('data-style', 'danger')
  })

  test('displayName을 지정하면 그대로 사용한다', () => {
    const Submit = withDefaults(
      Button,
      { styleType: 'primary' },
      'SubmitButton',
    )

    expect(Submit.displayName).toBe('SubmitButton')
  })

  test('displayName 생략 시 래핑 대상 이름으로 자동 생성한다', () => {
    const Submit = withDefaults(Button, { styleType: 'primary' })

    expect(Submit.displayName).toBe('withDefaults(Button)')
  })

  test('호스트 엘리먼트도 래핑할 수 있다', () => {
    const Card = withDefaults('div', { role: 'group', className: 'card' })

    render(<Card>content</Card>)

    const el = screen.getByRole('group')
    expect(el).toHaveClass('card')
    expect(el).toHaveTextContent('content')
  })

  test('ref가 내부 컴포넌트로 전달된다 (ref-as-prop)', () => {
    function Input(props: {
      placeholder: string
      ref?: Ref<HTMLInputElement>
    }) {
      return <input {...props} />
    }
    const SearchInput = withDefaults(Input, { placeholder: '검색' })

    const ref = createRef<HTMLInputElement>()
    render(<SearchInput ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.placeholder).toBe('검색')
  })
})
