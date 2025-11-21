import { useSelections } from 'ahooks'
import { Key } from 'react'

type OptionItem = {
  key: Key
  label: string
}

type OptionValue = OptionItem['key']

type CheckboxGroupProps = {
  list: Array<OptionItem>
  defaultSelected: Array<OptionValue>
}

type CheckboxFormProps = Pick<CheckboxGroupProps, 'list'> & {
  onSubmit: (selected: OptionItem[]) => void
}

function CheckboxForm({ list, onSubmit }: CheckboxFormProps) {
  const { selected, toggle } = useSelections(list, {
    itemKey(item) {
      return item.key
    },
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
          <label key={item.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input
              type="checkbox"
              checked={selected.some(
                (selectedItem) => selectedItem.key === item.key
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
      <pre data-testid="selected" className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs overflow-auto">
        {JSON.stringify(
          { selected, noneSelected, allSelected, partiallySelected },
          null,
          2
        )}
      </pre>
      <CheckboxForm
        list={list}
        onSubmit={(selectedItems) => {
          setSelected(selectedItems)
        }}
      />
    </div>
  )
}
