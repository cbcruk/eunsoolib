import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckboxGroup } from './checkbox-group'

const meta = {
  title: 'Components/CheckboxGroup',
  component: CheckboxGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CheckboxGroup>

export default meta
type Story = StoryObj<typeof meta>

const frameworkList = [
  { key: '1', label: 'React' },
  { key: '2', label: 'Vue' },
  { key: '3', label: 'Angular' },
  { key: '4', label: 'Svelte' },
  { key: '5', label: 'Solid' },
]

export const Default: Story = {
  args: {
    list: frameworkList,
    defaultSelected: [],
  },
}

export const WithDefaultSelected: Story = {
  args: {
    list: frameworkList,
    defaultSelected: ['1', '2'],
  },
}

export const AllSelected: Story = {
  args: {
    list: frameworkList,
    defaultSelected: ['1', '2', '3', '4', '5'],
  },
}

const longList = Array.from({ length: 20 }, (_, i) => ({
  key: String(i + 1),
  label: `Option ${i + 1}`,
}))

export const LongList: Story = {
  args: {
    list: longList,
    defaultSelected: ['1', '5', '10'],
  },
}
