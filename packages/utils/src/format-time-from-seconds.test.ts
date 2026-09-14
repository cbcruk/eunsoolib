import { expect, test } from 'vitest'
import { formatTimeFromSeconds } from './format-time-from-seconds'

test('formatTimeFromSeconds', () => {
  expect(formatTimeFromSeconds(1)).toMatchInlineSnapshot(`"1초"`)
  expect(formatTimeFromSeconds(3601)).toMatchInlineSnapshot(`"1시간 1초"`)
  expect(formatTimeFromSeconds(3701)).toMatchInlineSnapshot(`"1시간 1분 41초"`)
})
