import { describe, expect, test } from 'vitest'
import { groupTokens, tokenizeValue, type TokenRule } from './tokenize'

/** Compact a token list to `name:start-end` strings for readable assertions. */
function labels(value: string, rules: TokenRule[], overlap?: 'first' | 'all') {
  return tokenizeValue(value, rules, { overlap }).map(
    (t) => `${t.name}:${t.start}-${t.end}`,
  )
}

const COMMENT: TokenRule = { name: 'comment', pattern: /\/\/[^\n]*/ }
const KEYWORD: TokenRule = { name: 'keyword', pattern: /\b(?:return|const)\b/ }

describe('tokenizeValue (overlap: first)', () => {
  test('value나 rules가 비면 빈 배열을 반환해야 함', () => {
    expect(tokenizeValue('', [KEYWORD])).toEqual([])
    expect(tokenizeValue('return', [])).toEqual([])
  })

  test('기본 전략은 first여야 함', () => {
    expect(labels('// return', [COMMENT, KEYWORD])).toEqual(
      labels('// return', [COMMENT, KEYWORD], 'first'),
    )
  })

  test('앞선 규칙이 매칭되면 그 구간의 뒤 규칙을 삼켜야 함', () => {
    expect(labels('// return 1', [COMMENT, KEYWORD])).toEqual([
      'comment:0-11',
    ])
  })

  test('규칙 순서가 달라도 해당 위치에서 한 규칙만 매칭되면 결과가 같아야 함', () => {
    // At offset 0 only the comment rule can match, so precedence never applies.
    expect(labels('// return 1', [KEYWORD, COMMENT])).toEqual(['comment:0-11'])
  })

  test('주석 밖의 키워드는 그대로 매칭되어야 함', () => {
    expect(labels('const x = 1 // return', [COMMENT, KEYWORD])).toEqual([
      'keyword:0-5',
      'comment:12-21',
    ])
  })

  test('토큰은 서로 겹치지 않아야 함', () => {
    const tokens = tokenizeValue('status:open status:done', [
      { name: 'field', pattern: /\w+:/ },
      { name: 'word', pattern: /\w+/ },
    ])
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].end)
    }
    expect(tokens.map((t) => t.name)).toEqual([
      'field',
      'word',
      'field',
      'word',
    ])
  })

  test('어떤 규칙도 매칭되지 않는 구간은 건너뛰어야 함', () => {
    expect(labels('?? const ??', [KEYWORD])).toEqual(['keyword:3-8'])
  })

  test('zero-width 패턴에 멈추지 않아야 함', () => {
    expect(labels('abc', [{ name: 'empty', pattern: /(?:)/ }])).toEqual([])
  })

  test('rule 인덱스를 토큰에 담아야 함', () => {
    const tokens = tokenizeValue('const x // y', [COMMENT, KEYWORD])
    expect(tokens.map((t) => t.rule)).toEqual([1, 0])
  })
})

describe('tokenizeValue (overlap: all)', () => {
  test('모든 규칙이 독립적으로 전체를 스캔해 겹침을 유지해야 함', () => {
    expect(
      labels(
        'status:open',
        [
          { name: 'field', pattern: /\w+:/ },
          { name: 'word', pattern: /\w+/ },
        ],
        'all',
      ),
    ).toEqual(['field:0-7', 'word:0-6', 'word:7-11'])
  })

  test('start 순서로 정렬하고 동률이면 규칙 순서를 따라야 함', () => {
    const tokens = tokenizeValue(
      'aa',
      [
        { name: 'second', pattern: /a/ },
        { name: 'first', pattern: /aa/ },
      ],
      { overlap: 'all' },
    )
    expect(tokens.map((t) => `${t.name}:${t.start}`)).toEqual([
      'second:0',
      'first:0',
      'second:1',
    ])
  })

  test('zero-width 패턴에 멈추지 않아야 함', () => {
    expect(labels('abc', [{ name: 'empty', pattern: /(?:)/ }], 'all')).toEqual(
      [],
    )
  })
})

describe('tokenizeValue (패턴 옵션)', () => {
  test('문자열 패턴은 기본적으로 대소문자를 무시해야 함', () => {
    expect(labels('Cat cat', [{ name: 'c', pattern: 'cat' }])).toEqual([
      'c:0-3',
      'c:4-7',
    ])
  })

  test('caseSensitive를 존중해야 함', () => {
    expect(
      labels('Cat cat', [{ name: 'c', pattern: 'cat', caseSensitive: true }]),
    ).toEqual(['c:4-7'])
  })

  test('wholeWord를 존중해야 함', () => {
    expect(
      labels('cat category', [{ name: 'c', pattern: 'cat', wholeWord: true }]),
    ).toEqual(['c:0-3'])
  })

  test('문자열 패턴의 정규식 메타문자를 이스케이프해야 함', () => {
    expect(labels('a.c abc', [{ name: 'd', pattern: 'a.c' }])).toEqual([
      'd:0-3',
    ])
  })

  test('RegExp 패턴에서는 caseSensitive·wholeWord를 무시해야 함', () => {
    expect(
      labels('Cat cat', [
        { name: 'c', pattern: /cat/, caseSensitive: true, wholeWord: true },
      ]),
    ).toEqual(['c:4-7'])
  })

  test('전달한 RegExp의 lastIndex를 변경하지 않아야 함', () => {
    const pattern = /cat/g
    pattern.lastIndex = 5
    tokenizeValue('cat cat cat', [{ name: 'c', pattern }])
    expect(pattern.lastIndex).toBe(5)
  })

  test('offset은 UTF-16 code unit 단위여야 함', () => {
    // '😀' is one code point but two code units, like selectionStart counts.
    expect(labels('a😀b', [{ name: 'b', pattern: 'b' }])).toEqual(['b:3-4'])
  })
})

describe('groupTokens', () => {
  const rules: TokenRule[] = [
    { name: 'mark', pattern: /a/, priority: 1 },
    { name: 'mark', pattern: /b/, priority: 3 },
    { name: 'other', pattern: /c/ },
  ]

  test('같은 name의 규칙들을 하나의 항목으로 합쳐야 함', () => {
    const groups = groupTokens(tokenizeValue('abc', rules, { overlap: 'all' }), rules)
    expect(groups.map((g) => g.name)).toEqual(['mark', 'other'])
    expect(groups[0].spans).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 2 },
    ])
  })

  test('name을 공유하는 규칙 중 가장 높은 priority를 써야 함', () => {
    const groups = groupTokens(tokenizeValue('abc', rules, { overlap: 'all' }), rules)
    expect(groups[0].priority).toBe(3)
  })

  test('priority를 생략하면 0이어야 함', () => {
    const groups = groupTokens(tokenizeValue('abc', rules, { overlap: 'all' }), rules)
    expect(groups[1].priority).toBe(0)
  })

  test('한 번도 매칭되지 않은 name은 항목을 만들지 않아야 함', () => {
    expect(groupTokens(tokenizeValue('c', rules), rules).map((g) => g.name)).toEqual(
      ['other'],
    )
  })

  test('토큰이 없으면 빈 배열을 반환해야 함', () => {
    expect(groupTokens([], rules)).toEqual([])
  })
})
