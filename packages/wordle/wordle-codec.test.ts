import { expect, test } from 'vitest'
import { WordleCodec } from './wordle-codec'

test('WordleCodec', () => {
  expect(WordleCodec.encode('apple')).toMatchInlineSnapshot(`"YXBwbGU="`)
  expect(WordleCodec.decode('YXBwbGU=')).toMatchInlineSnapshot(`"apple"`)
})
