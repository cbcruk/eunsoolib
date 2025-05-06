import { expect, test } from 'vitest'
import { DateNavigator } from './date-navigator'

test('DateNavigator', () => {
  const dateNavigator = new DateNavigator('2025-05-06')

  expect(dateNavigator.previous()).toMatchInlineSnapshot(`"2025-05-05"`)
  expect(dateNavigator.next()).toMatchInlineSnapshot(`"2025-05-06"`)
})
