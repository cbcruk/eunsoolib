import { useSelections } from 'ahooks'
import { useRef, type Key, type ReactNode } from 'react'

/** 체크박스 하나에 대응하는 선택지. */
export type CheckboxGroupOption = {
  /** 선택지를 구분하는 고유 값 */
  key: Key
  /** 체크박스 옆에 표시할 텍스트 */
  label: string
}

/** {@link CheckboxGroup}의 props. */
export type CheckboxGroupProps = {
  /** 렌더링할 선택지 목록 */
  list: Array<CheckboxGroupOption>
  /**
   * 처음에 선택해 둘 항목들의 `key` 목록. 첫 렌더링에만 쓰이고, `list`에 없는 `key`는
   * 무시한다.
   *
   * @default []
   */
  defaultSelected?: Array<Key>
  /**
   * 제출한 선택이 직전에 확정된 선택과 다를 때 호출된다.
   *
   * 체크박스를 클릭하는 동안에는 호출되지 않고, 제출 시점에만 확정된 선택과 비교한다.
   * 처음 확정된 선택은 `defaultSelected`다.
   *
   * @param selected - 새로 확정된 선택 항목. `list` 순서를 따른다
   */
  onChange?: (selected: Array<CheckboxGroupOption>) => void
  /**
   * 폼을 제출할 때마다 선택이 바뀌었는지와 관계없이 호출된다.
   *
   * 선택이 바뀌었다면 `onChange`가 먼저 호출된다.
   *
   * @param selected - 제출한 선택 항목. `list` 순서를 따른다
   */
  onSubmit?: (selected: Array<CheckboxGroupOption>) => void
  /**
   * 제출 버튼에 표시할 내용.
   *
   * @default 'Submit'
   */
  submitLabel?: ReactNode
}

function hasSameKeys(a: ReadonlySet<Key>, b: ReadonlySet<Key>) {
  return a.size === b.size && [...a].every((key) => b.has(key))
}

/**
 * 체크하는 동안의 선택은 폼 안에만 두고, 제출할 때만 확정해 올려보내는 체크박스 그룹.
 *
 * 체크박스를 클릭해도 `onChange`는 호출되지 않는다. 제출 버튼을 누르면 `onSubmit`이
 * 항상 호출되고, 직전에 확정된 선택과 달라졌을 때만 `onChange`가 먼저 호출된다.
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
 *   onChange={(selected) => saveFilters(selected.map((item) => item.key))}
 *   submitLabel="적용"
 * />
 * ```
 */
export function CheckboxGroup({
  list,
  defaultSelected = [],
  onChange,
  onSubmit,
  submitLabel = 'Submit',
}: CheckboxGroupProps) {
  const { selected, toggle } = useSelections(list, {
    itemKey(item) {
      return item.key
    },
    defaultSelected: list.filter((item) => defaultSelected.includes(item.key)),
  })
  const committedKeys = useRef<ReadonlySet<Key>>(
    new Set(selected.map((item) => item.key)),
  )
  const selectedKeys = new Set(selected.map((item) => item.key))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()

        const submitted = list.filter((item) => selectedKeys.has(item.key))

        if (!hasSameKeys(committedKeys.current, selectedKeys)) {
          committedKeys.current = selectedKeys
          onChange?.(submitted)
        }

        onSubmit?.(submitted)
      }}
      className="w-full max-w-md space-y-3"
    >
      <div className="space-y-2">
        {list.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedKeys.has(item.key)}
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
        {submitLabel}
      </button>
    </form>
  )
}
