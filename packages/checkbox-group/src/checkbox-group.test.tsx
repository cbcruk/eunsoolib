import { render, screen, fireEvent } from '@testing-library/react'
import { CheckboxGroup } from './checkbox-group'

const mockList = [
  { key: '1', label: '옵션 1' },
  { key: '2', label: '옵션 2' },
  { key: '3', label: '옵션 3' },
]

function checkbox(label: string) {
  return screen.getByLabelText(label)
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
}

function renderGroup(defaultSelected?: string[]) {
  const onChange = vi.fn()
  const onSubmit = vi.fn()

  render(
    <CheckboxGroup
      list={mockList}
      defaultSelected={defaultSelected}
      onChange={onChange}
      onSubmit={onSubmit}
    />,
  )

  return { onChange, onSubmit }
}

describe('CheckboxGroup', () => {
  describe('초기 상태', () => {
    it('defaultSelected가 없을 때 아무 체크박스도 체크되지 않아야 함', () => {
      renderGroup()

      mockList.forEach((item) => {
        expect(checkbox(item.label)).not.toBeChecked()
      })
    })

    it('defaultSelected에 있는 항목만 체크되어야 함', () => {
      renderGroup(['1', '2'])

      expect(checkbox('옵션 1')).toBeChecked()
      expect(checkbox('옵션 2')).toBeChecked()
      expect(checkbox('옵션 3')).not.toBeChecked()
    })

    it('list에 없는 defaultSelected key는 무시해야 함', () => {
      const { onSubmit } = renderGroup(['1', 'missing'])

      submit()

      expect(onSubmit).toHaveBeenCalledWith([mockList[0]])
    })

    it('렌더링만으로는 콜백이 호출되지 않아야 함', () => {
      const { onChange, onSubmit } = renderGroup(['1'])

      expect(onChange).not.toHaveBeenCalled()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('체크 중 (draft)', () => {
    it('체크박스 클릭 시 체크 상태만 바뀌고 콜백은 호출되지 않아야 함', () => {
      const { onChange, onSubmit } = renderGroup()

      fireEvent.click(checkbox('옵션 1'))

      expect(checkbox('옵션 1')).toBeChecked()
      expect(onChange).not.toHaveBeenCalled()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('제출 (commit)', () => {
    it('제출 시 선택이 바뀌었으면 onChange와 onSubmit에 선택 항목을 넘겨야 함', () => {
      const { onChange, onSubmit } = renderGroup()

      fireEvent.click(checkbox('옵션 1'))
      fireEvent.click(checkbox('옵션 2'))
      submit()

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith([mockList[0], mockList[1]])
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith([mockList[0], mockList[1]])
    })

    it('onChange가 onSubmit보다 먼저 호출되어야 함', () => {
      const { onChange, onSubmit } = renderGroup()

      fireEvent.click(checkbox('옵션 1'))
      submit()

      expect(onChange.mock.invocationCallOrder[0]).toBeLessThan(
        onSubmit.mock.invocationCallOrder[0],
      )
    })

    it('선택 항목은 클릭 순서와 관계없이 list 순서로 전달되어야 함', () => {
      const { onSubmit } = renderGroup()

      fireEvent.click(checkbox('옵션 3'))
      fireEvent.click(checkbox('옵션 1'))
      submit()

      expect(onSubmit).toHaveBeenCalledWith([mockList[0], mockList[2]])
    })

    it('선택이 defaultSelected와 같으면 onSubmit만 호출되어야 함', () => {
      const { onChange, onSubmit } = renderGroup(['1'])

      submit()

      expect(onChange).not.toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledWith([mockList[0]])
    })

    it('체크했다가 되돌린 뒤 제출하면 onChange가 호출되지 않아야 함', () => {
      const { onChange, onSubmit } = renderGroup(['1'])

      fireEvent.click(checkbox('옵션 2'))
      fireEvent.click(checkbox('옵션 2'))
      submit()

      expect(onChange).not.toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('같은 선택으로 다시 제출하면 onChange는 호출되지 않고 onSubmit만 호출되어야 함', () => {
      const { onChange, onSubmit } = renderGroup()

      fireEvent.click(checkbox('옵션 1'))
      submit()
      submit()

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledTimes(2)
    })

    it('직전에 확정된 선택과 비교해 onChange를 호출해야 함', () => {
      const { onChange } = renderGroup()

      fireEvent.click(checkbox('옵션 1'))
      submit()
      fireEvent.click(checkbox('옵션 2'))
      submit()

      expect(onChange).toHaveBeenCalledTimes(2)
      expect(onChange).toHaveBeenLastCalledWith([mockList[0], mockList[1]])
    })

    it('모두 해제한 뒤 제출하면 빈 배열을 넘겨야 함', () => {
      const { onChange, onSubmit } = renderGroup(['1', '2'])

      fireEvent.click(checkbox('옵션 1'))
      fireEvent.click(checkbox('옵션 2'))
      submit()

      expect(onChange).toHaveBeenCalledWith([])
      expect(onSubmit).toHaveBeenCalledWith([])
    })

    it('제출 후에도 체크 상태가 유지되어야 함', () => {
      renderGroup()

      fireEvent.click(checkbox('옵션 2'))
      submit()

      expect(checkbox('옵션 2')).toBeChecked()
      expect(checkbox('옵션 1')).not.toBeChecked()
    })

    it('콜백 없이도 제출할 수 있어야 함', () => {
      render(<CheckboxGroup list={mockList} />)

      fireEvent.click(checkbox('옵션 1'))

      expect(() => submit()).not.toThrow()
    })
  })

  describe('submitLabel', () => {
    it('submitLabel을 넘기지 않으면 Submit을 표시해야 함', () => {
      renderGroup()

      expect(screen.getByRole('button')).toHaveTextContent('Submit')
    })

    it('submitLabel로 제출 버튼 내용을 바꿀 수 있어야 함', () => {
      const onSubmit = vi.fn()
      render(
        <CheckboxGroup
          list={mockList}
          submitLabel="적용"
          onSubmit={onSubmit}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '적용' }))

      expect(onSubmit).toHaveBeenCalledWith([])
    })
  })

  it('디버그용 선택 상태 출력을 렌더링하지 않아야 함', () => {
    renderGroup(['1'])

    expect(screen.queryByTestId('selected')).not.toBeInTheDocument()
  })
})
