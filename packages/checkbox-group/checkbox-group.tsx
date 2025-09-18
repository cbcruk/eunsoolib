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
    >
      {list.map((item) => (
        <label key={item.key}>
          <input
            type="checkbox"
            checked={selected.some(
              (selectedItem) => selectedItem.key === item.key
            )}
            onChange={() => toggle(item)}
          />
          {item.label}
        </label>
      ))}

      <button type="submit">submit</button>
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
    <>
      <pre data-testid="selected">
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
    </>
  )
}
