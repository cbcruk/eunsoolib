import { describe, expect, test } from 'vitest'
import { VttParser } from './vtt-to-json'
import { readFile } from 'fs/promises'

test('vttToJson', async () => {
  const vtt = await readFile('packages/vtt-to-json/sample.vtt', 'utf-8')
  const parser = new VttParser(vtt)
  const result = parser.toJson()

  expect(result).toMatchSnapshot()
})

describe('VttParser', () => {
  test('같은 인스턴스에서 toJson()을 다시 호출해도 같은 결과를 반환해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '00:00:01.000 --> 00:00:02.000',
        '안녕하세요',
        '',
        '00:00:03.000 --> 00:00:04.000',
        '반갑습니다',
        '',
      ].join('\n'),
    )

    const first = parser.toJson()
    const second = parser.toJson()

    expect(first).toEqual([
      { seconds: 1, timestamp: '00:00:01.000', text: '안녕하세요' },
      { seconds: 3, timestamp: '00:00:03.000', text: '반갑습니다' },
    ])
    expect(second).toEqual(first)
  })

  test('시가 생략된 mm:ss.SSS 타임스탬프를 인식해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '00:01.500 --> 00:02.000',
        '짧은 형식',
        '',
        '01:02:03.250 --> 01:02:04.000',
        '긴 형식',
        '',
      ].join('\n'),
    )

    expect(parser.toJson()).toEqual([
      { seconds: 1.5, timestamp: '00:01.500', text: '짧은 형식' },
      { seconds: 3723.25, timestamp: '01:02:03.250', text: '긴 형식' },
    ])
  })

  test('cue 식별자 줄은 텍스트로 넣지 않아야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '1',
        '00:00:01.000 --> 00:00:02.000',
        '첫 줄',
        '',
        'intro-2',
        '00:00:03.000 --> 00:00:04.000',
        '둘째 줄',
        '',
      ].join('\n'),
    )

    expect(parser.toJson().map((cue) => cue.text)).toEqual(['첫 줄', '둘째 줄'])
  })

  test('NOTE / STYLE / REGION 블록은 텍스트로 넣지 않아야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        'STYLE',
        '::cue { color: red }',
        '',
        'REGION',
        'id:fred width:40%',
        '',
        '00:00:01.000 --> 00:00:02.000',
        '첫 줄',
        '',
        'NOTE 여러 줄짜리',
        '메모입니다',
        '',
        'NOTE',
        '',
        '00:00:03.000 --> 00:00:04.000',
        '둘째 줄',
        '',
      ].join('\n'),
    )

    expect(parser.toJson().map((cue) => cue.text)).toEqual(['첫 줄', '둘째 줄'])
  })

  test('CRLF 줄바꿈과 여러 줄 cue 본문을 처리해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '1',
        '00:00:01.000 --> 00:00:02.000',
        'NOTE 아님',
        '둘째 줄',
        '',
      ].join('\r\n'),
    )

    expect(parser.toJson()).toEqual([
      { seconds: 1, timestamp: '00:00:01.000', text: 'NOTE 아님' },
      { seconds: 1, timestamp: '00:00:01.000', text: '둘째 줄' },
    ])
  })
})
