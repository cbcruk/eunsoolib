import type { Meta, StoryObj } from '@storybook/react-vite'
import { OverflowDemo } from './is-overflowing'

const meta = {
  title: 'Components/OverflowDemo',
  component: OverflowDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    containerWidth: {
      control: { type: 'range', min: 50, max: 500, step: 10 },
    },
    containerHeight: {
      control: { type: 'range', min: 30, max: 300, step: 10 },
    },
    showVerticalDemo: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof OverflowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const HorizontalOverflow: Story = {
  args: {
    containerWidth: 150,
    containerHeight: 80,
    showVerticalDemo: false,
  },
}

export const VerticalOverflow: Story = {
  args: {
    containerWidth: 200,
    containerHeight: 100,
    showVerticalDemo: true,
  },
}

export const NoOverflow: Story = {
  args: {
    containerWidth: 400,
    containerHeight: 200,
    showVerticalDemo: false,
  },
}

export const Interactive: Story = {
  args: {
    containerWidth: 200,
    containerHeight: 100,
    showVerticalDemo: false,
  },
}
