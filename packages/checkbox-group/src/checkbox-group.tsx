import { useSelections } from 'ahooks'
import { Key } from 'react'

/** 체크박스 하나에 대응하는 선택지 */
type OptionItem = {
  key: Key
  label: string
}

type OptionValue = OptionItem['key']

type CheckboxGroupProps = {
  /** 렌더링할 선택지 목록 */
  list: Array<OptionItem>
  /** 초기에 선택해 둘 항목들의 `key` 목록 */
  defaultSelected: Array<OptionValue>
}

type CheckboxFormProps = Pick<CheckboxGroupProps, 'list'> & {
  defaultSelected: OptionItem[]
  onSubmit: (selected: OptionItem[]) => void
}

/**
 * 체크박스 목록과 제출 버튼을 렌더링하는 내부 폼
 *
 * 선택 상태는 폼 안에서만 관리하고, 제출 시점에만 `onSubmit`으로 올려보낸다.
 */
function CheckboxForm({ list, defaultSelected, onSubmit }: CheckboxFormProps) {
  const { selected, toggle } = useSelections(list, {
    itemKey(item) {
      return item.key
    },
    defaultSelected,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(selected)
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        {list.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.some(
                (selectedItem) => selectedItem.key === item.key,
              )}
              onChange={() => toggle(item)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            />
            <span className="text-sm text-gray-700">{item.label}</span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Submit
      </button>
    </form>
  )
}

/**
 * 다중 선택 체크박스 그룹
 *
 * 내부 폼에서 선택한 값을 제출할 때마다 확정 상태로 반영하고, 현재 선택 상태와
 * 전체/부분/미선택 여부를 함께 표시한다.
 *
 * @example
 * ```tsx
 * import { CheckboxGroup } from '@cbcruk/checkbox-group'
 *
 * <CheckboxGroup
 *   list={[
 *     { key: 'a', label: '옵션 A' },
 *     { key: 'b', label: '옵션 B' },
 *   ]}
 *   defaultSelected={['a']}
 * />
 * ```
 */
export function CheckboxGroup({ list, defaultSelected }: CheckboxGroupProps) {
  const {
    selected,
    noneSelected,
    allSelected,
    partiallySelected,
    setSelected,
  } = useSelections(list, {
    itemKey(item) {
      return item.key
    },
    defaultSelected: list.filter((item) => defaultSelected?.includes(item.key)),
  })

  return (
    <div className="w-full max-w-md space-y-4">
      <pre
        data-testid="selected"
        className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs overflow-auto"
      >
        {JSON.stringify(
          { selected, noneSelected, allSelected, partiallySelected },
          null,
          2,
        )}
      </pre>
      <CheckboxForm
        list={list}
        defaultSelected={selected}
        onSubmit={(selectedItems) => {
          setSelected(selectedItems)
        }}
      />
    </div>
  )
}
