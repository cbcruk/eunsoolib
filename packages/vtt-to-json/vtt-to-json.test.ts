import { expect, test } from 'vitest'
import { VttParser } from './vtt-to-json'
import { readFile } from 'fs/promises'

test('vttToJson', async () => {
  const vtt = await readFile('packages/vtt-to-json/sample.vtt', 'utf-8')
  const parser = new VttParser(vtt)
  const result = parser.toJson()

  expect(result).toMatchSnapshot()
})
