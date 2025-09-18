import { render, screen, fireEvent } from '@testing-library/react'
import { CheckboxGroup } from './checkbox-group'

const mockList = [
  { key: '1', label: '옵션 1' },
  { key: '2', label: '옵션 2' },
  { key: '3', label: '옵션 3' },
]

describe('CheckboxGroup', () => {
  describe('초기 상태', () => {
    it('defaultSelected가 없을 때 아무것도 선택되지 않은 상태여야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={[]} />)

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.selected).toEqual([])
      expect(selectedData.noneSelected).toBe(true)
      expect(selectedData.allSelected).toBe(false)
      expect(selectedData.partiallySelected).toBe(false)
    })

    it('defaultSelected가 있을 때 해당 항목들이 선택된 상태여야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={['1', '2']} />)

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.selected).toHaveLength(2)
      expect(selectedData.selected.map((item: any) => item.key)).toEqual([
        '1',
        '2',
      ])
      expect(selectedData.noneSelected).toBe(false)
      expect(selectedData.allSelected).toBe(false)
      expect(selectedData.partiallySelected).toBe(true)
    })

    it('모든 항목이 선택된 상태일 때 allSelected가 true여야 함', () => {
      render(
        <CheckboxGroup list={mockList} defaultSelected={['1', '2', '3']} />
      )

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.allSelected).toBe(true)
      expect(selectedData.noneSelected).toBe(false)
      expect(selectedData.partiallySelected).toBe(false)
    })
  })

  describe('CheckboxForm 상호작용', () => {
    it('체크박스 클릭 시 폼 내부 상태만 변경되고 상위 상태는 변경되지 않아야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={[]} />)

      const checkbox1 = screen.getByLabelText('옵션 1')
      fireEvent.click(checkbox1)

      // CheckboxGroup의 상태는 변경되지 않아야 함
      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.selected).toEqual([])
      expect(selectedData.noneSelected).toBe(true)
    })

    it('저장 버튼 클릭 시에만 CheckboxGroup 상태가 동기화되어야 함 (Draft/Commit 패턴)', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={[]} />)

      // 체크박스 선택
      const checkbox1 = screen.getByLabelText('옵션 1')
      const checkbox2 = screen.getByLabelText('옵션 2')
      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)

      // 아직 CheckboxGroup 상태는 변경되지 않음
      let selectedData = JSON.parse(screen.getByTestId('selected').textContent!)
      expect(selectedData.selected).toEqual([])

      // 저장 버튼 클릭
      const submitButton = screen.getByRole('button', { name: 'submit' })
      fireEvent.click(submitButton)

      // 이제 CheckboxGroup 상태가 동기화됨
      selectedData = JSON.parse(screen.getByTestId('selected').textContent!)
      expect(selectedData.selected).toHaveLength(2)
      expect(selectedData.selected.map((item: any) => item.key)).toEqual([
        '1',
        '2',
      ])
      expect(selectedData.partiallySelected).toBe(true)
    })

    it('일부 선택 후 저장하면 partiallySelected 상태가 되어야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={[]} />)

      const checkbox1 = screen.getByLabelText('옵션 1')
      fireEvent.click(checkbox1)

      const submitButton = screen.getByRole('button', { name: 'submit' })
      fireEvent.click(submitButton)

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.partiallySelected).toBe(true)
      expect(selectedData.noneSelected).toBe(false)
      expect(selectedData.allSelected).toBe(false)
    })

    it('모든 항목 선택 후 저장하면 allSelected 상태가 되어야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={[]} />)

      // 모든 체크박스 선택
      mockList.forEach((item) => {
        const checkbox = screen.getByLabelText(item.label)
        fireEvent.click(checkbox)
      })

      const submitButton = screen.getByRole('button', { name: 'submit' })
      fireEvent.click(submitButton)

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.allSelected).toBe(true)
      expect(selectedData.noneSelected).toBe(false)
      expect(selectedData.partiallySelected).toBe(false)
    })

    it('선택된 상태에서 모두 해제 후 저장하면 noneSelected 상태가 되어야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={['1', '2']} />)

      // 모든 체크박스 해제
      const checkbox1 = screen.getByLabelText('옵션 1')
      const checkbox2 = screen.getByLabelText('옵션 2')
      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)

      const submitButton = screen.getByRole('button', { name: 'submit' })
      fireEvent.click(submitButton)

      const selectedData = JSON.parse(
        screen.getByTestId('selected').textContent!
      )
      expect(selectedData.noneSelected).toBe(true)
      expect(selectedData.allSelected).toBe(false)
      expect(selectedData.partiallySelected).toBe(false)
    })
  })

  describe('상태 관리 검증', () => {
    it('두 개의 useSelections가 독립적으로 동작해야 함', () => {
      render(<CheckboxGroup list={mockList} defaultSelected={['1']} />)

      // 초기 상태 확인
      let selectedData = JSON.parse(screen.getByTestId('selected').textContent!)
      expect(selectedData.selected.map((item: any) => item.key)).toEqual(['1'])

      // 폼에서 추가 선택
      const checkbox2 = screen.getByLabelText('옵션 2')
      fireEvent.click(checkbox2)

      // CheckboxGroup 상태는 여전히 이전 상태
      selectedData = JSON.parse(screen.getByTestId('selected').textContent!)
      expect(selectedData.selected.map((item: any) => item.key)).toEqual(['1'])

      // 저장 후에만 동기화
      const submitButton = screen.getByRole('button', { name: 'submit' })
      fireEvent.click(submitButton)

      selectedData = JSON.parse(screen.getByTestId('selected').textContent!)
      expect(selectedData.selected.map((item: any) => item.key)).toEqual([
        '1',
        '2',
      ])
    })
  })
})
