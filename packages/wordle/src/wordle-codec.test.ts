import { expect, test } from 'vitest'
import { WordleCodec } from './wordle-codec'

test('WordleCodec', () => {
  expect(WordleCodec.encode('apple')).toMatchInlineSnapshot(`"YXBwbGU="`)
  expect(WordleCodec.decode('YXBwbGU=')).toMatchInlineSnapshot(`"apple"`)
})

test('WordleCodec은 Latin-1 밖의 문자도 인코딩하고 원래대로 디코딩한다', () => {
  for (const word of ['사과나무숲', 'café!', '🍎apple']) {
    expect(WordleCodec.decode(WordleCodec.encode(word))).toBe(word)
  }

  expect(WordleCodec.encode('사과')).toBe('7IKs6rO8')
})
