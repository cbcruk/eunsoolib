import { createRef, type ComponentProps, type Ref } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, test } from 'vitest'
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

type LinkOrButtonProps =
  | { variant: 'link'; href: string; size: 'small' | 'medium' }
  | { variant: 'button'; onClick: () => void; size: 'small' | 'medium' }

function LinkOrButton(props: LinkOrButtonProps) {
  return props.variant === 'link' ? (
    <a href={props.href} data-size={props.size}>
      link
    </a>
  ) : (
    <button onClick={props.onClick} data-size={props.size}>
      button
    </button>
  )
}

describe('withDefaults 타입', () => {
  test('기본값을 준 prop만 optional이 되고 나머지 prop은 그대로 필수다', () => {
    const Submit = withDefaults(Button, { styleType: 'primary' })

    expectTypeOf<ComponentProps<typeof Submit>>().toEqualTypeOf<
      Omit<ButtonProps, 'styleType'> & Partial<Pick<ButtonProps, 'styleType'>>
    >()

    // @ts-expect-error label은 기본값이 없으므로 필수
    void (<Submit size="small" />)
  })

  test('판별 유니온 props는 멤버별 모양을 유지한다', () => {
    const Small = withDefaults(LinkOrButton, { size: 'small' })

    void (<Small variant="link" href="/" />)
    void (<Small variant="button" onClick={() => {}} />)

    // @ts-expect-error link 멤버에는 href가 필수
    void (<Small variant="link" />)
    // @ts-expect-error button 멤버에는 href가 없음
    void (<Small variant="button" href="/" onClick={() => {}} />)
  })

  test('판별자에 기본값을 주면 다른 멤버를 쓸 때는 판별자를 직접 넘겨야 한다', () => {
    const Link = withDefaults(LinkOrButton, { variant: 'link' })

    void (<Link href="/" size="small" />)
    void (<Link variant="button" onClick={() => {}} size="small" />)

    // @ts-expect-error 기본값 variant는 link이므로 button 멤버는 variant를 생략할 수 없음
    void (<Link onClick={() => {}} size="small" />)
  })

  test('판별 유니온 props도 호출부에서 렌더링된다', () => {
    const Small = withDefaults(LinkOrButton, { size: 'small' })

    render(<Small variant="link" href="/docs" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/docs')
    expect(link).toHaveAttribute('data-size', 'small')
  })

  test('컴포넌트에 없는 키를 defaults에 넘기면 타입 에러다', () => {
    const preset = { styleType: 'primary', lable: '저장' } as const

    // @ts-expect-error lable은 Button의 prop이 아님 (미리 선언한 객체도 검사)
    withDefaults(Button, preset)
    // @ts-expect-error foo는 Button의 prop이 아님
    withDefaults(Button, { styleType: 'primary', foo: 1 })
  })

  test('유니온 멤버 중 하나에만 있는 키와 data-* 속성은 defaults로 넘길 수 있다', () => {
    const Home = withDefaults(LinkOrButton, { href: '/' })
    const Card = withDefaults('div', { role: 'group', 'data-kind': 'card' })

    expectTypeOf(Home).toBeFunction()
    expectTypeOf(Card).toBeFunction()
  })
})
