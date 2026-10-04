/**
 * Pure tokenizer: a string plus an ordered rule list in, character spans out.
 *
 * Nothing here touches the DOM, the `CSS.highlights` registry, or the
 * `OpaqueRange` API, so the overlap rules — the part that is easy to get wrong —
 * are testable without a browser. {@link ./value-range.ts} turns the spans this
 * produces into live ranges inside an `<input>` or `<textarea>`.
 */

import { literalSource, withoutFlag } from './pattern'

/** One pattern and the highlight name its matches are registered under. */
export interface TokenRule {
  /** CSS `::highlight()` name for this rule's matches. Rules may share a name. */
  name: string
  /**
   * Text or expression to match. A `RegExp` keeps its own flags, so
   * `caseSensitive` and `wholeWord` are ignored for one.
   */
  pattern: string | RegExp
  /**
   * Case sensitive match. Ignored for `RegExp` patterns.
   * @default false
   */
  caseSensitive?: boolean
  /**
   * Match whole words only (wraps the pattern in `\b`). Ignored for `RegExp`
   * patterns.
   * @default false
   */
  wholeWord?: boolean
  /**
   * Stacking order of this rule's highlight name against other names. When
   * several rules share a name the highest value wins.
   * @default 0
   */
  priority?: number
}

/** One match: a half-open character span `[start, end)` and its rule. */
export interface Token {
  /** The matching rule's highlight name. */
  readonly name: string
  /** Start offset, in UTF-16 code units into the tokenized string. */
  readonly start: number
  /** End offset, exclusive. */
  readonly end: number
  /** Index of the rule in the rule list that produced this token. */
  readonly rule: number
}

/** How matches covering the same characters are resolved. */
export type OverlapStrategy = 'first' | 'all'

/** Options for {@link tokenizeValue}. */
export interface TokenizeOptions {
  /**
   * How matches covering the same characters resolve.
   *
   * - `'first'` — scan left to right. At each position the earliest rule in the
   *   list that matches *there* wins, and the scan jumps past its match, so a
   *   comment rule swallows keywords inside the comment. Tokens never overlap.
   * - `'all'` — every rule scans the whole string independently and every match
   *   is emitted, overlaps included. Layering is left to `priority`.
   *
   * @default 'first'
   */
  overlap?: OverlapStrategy
}

/** The spans of one highlight name, ready to hand to a controller. */
export interface NamedSpans {
  /** CSS `::highlight()` name. */
  name: string
  /** Highest `priority` among the rules that contributed to this name. */
  priority: number
  /** Half-open `[start, end)` character spans, in the order tokenized. */
  spans: ReadonlyArray<{ start: number; end: number }>
}

/**
 * Compile a rule to a fresh RegExp carrying `flag`.
 *
 * Always clones, so a module-level `RegExp` literal passed as a pattern never
 * has its `lastIndex` mutated by tokenizing.
 */
function compile(rule: TokenRule, flag: 'y' | 'g'): RegExp {
  const { pattern, caseSensitive, wholeWord } = rule
  if (pattern instanceof RegExp) {
    const flags = withoutFlag(withoutFlag(pattern.flags, 'y'), 'g')
    return new RegExp(pattern.source, flags + flag)
  }
  return new RegExp(
    literalSource(pattern, wholeWord),
    caseSensitive ? flag : `i${flag}`,
  )
}

/**
 * Left-to-right scan. At each position the first rule that matches there wins
 * and the scan continues after its match, so tokens never overlap.
 */
function tokenizeFirst(value: string, rules: readonly TokenRule[]): Token[] {
  const regexps = rules.map((rule) => compile(rule, 'y'))
  const tokens: Token[] = []
  let position = 0

  while (position < value.length) {
    let width = 0
    for (let i = 0; i < regexps.length; i++) {
      const regex = regexps[i]
      regex.lastIndex = position
      const match = regex.exec(value)
      if (match && match[0].length > 0) {
        width = match[0].length
        tokens.push({
          name: rules[i].name,
          start: position,
          end: position + width,
          rule: i,
        })
        break
      }
    }
    // No rule matched here (or only zero-width): advance one code unit.
    position += width || 1
  }

  return tokens
}

/** Every rule scans the whole string; overlaps are kept. */
function tokenizeAll(value: string, rules: readonly TokenRule[]): Token[] {
  const tokens: Token[] = []

  rules.forEach((rule, i) => {
    const regex = compile(rule, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++
        continue
      }
      tokens.push({
        name: rule.name,
        start: match.index,
        end: match.index + match[0].length,
        rule: i,
      })
    }
  })

  return tokens.sort((a, b) => a.start - b.start || a.rule - b.rule)
}

/**
 * Match `rules` against `value` and return the character spans of every match.
 *
 * Offsets are UTF-16 code unit indices into `value`, the same units
 * `selectionStart` uses, so they can be handed straight to
 * `createValueRange()` when `value` came from `element.value`.
 *
 * Rule order is precedence: see {@link TokenizeOptions.overlap}.
 *
 * @param value - Text to scan, typically `element.value`
 * @param rules - Ordered rules; earlier rules win under `'first'`
 * @returns Tokens sorted by start offset. Empty when `value` or `rules` is empty
 *
 * @example A comment rule swallowing keywords inside it
 * ```ts
 * import { tokenizeValue } from '@cbcruk/highlight-kit'
 *
 * tokenizeValue('// return 1', [
 *   { name: 'comment', pattern: /\/\/.*$/m },
 *   { name: 'keyword', pattern: /\breturn\b/ },
 * ])
 * // [{ name: 'comment', start: 0, end: 11, rule: 0 }]
 * ```
 *
 * @example Independent patterns, overlaps kept
 * ```ts
 * import { tokenizeValue } from '@cbcruk/highlight-kit'
 *
 * tokenizeValue('status:open', [
 *   { name: 'field', pattern: /\w+:/ },
 *   { name: 'all', pattern: /\w+/ },
 * ], { overlap: 'all' })
 * ```
 */
export function tokenizeValue(
  value: string,
  rules: readonly TokenRule[],
  options: TokenizeOptions = {},
): Token[] {
  if (!value || rules.length === 0) return []
  return options.overlap === 'all'
    ? tokenizeAll(value, rules)
    : tokenizeFirst(value, rules)
}

/**
 * Collapse tokens into one entry per highlight name.
 *
 * Several rules may share a name; the resulting `priority` is the highest one
 * any contributing rule declared, since a controller tracks a single priority
 * per name.
 *
 * @param tokens - Tokens from {@link tokenizeValue}
 * @param rules - The same rule list those tokens were produced from
 * @returns One entry per name that matched at least once, in first-match order
 */
export function groupTokens(
  tokens: readonly Token[],
  rules: readonly TokenRule[],
): NamedSpans[] {
  interface Group {
    name: string
    priority: number
    spans: Array<{ start: number; end: number }>
  }
  const grouped = new Map<string, Group>()

  for (const token of tokens) {
    const priority = rules[token.rule]?.priority ?? 0
    const span = { start: token.start, end: token.end }
    const entry = grouped.get(token.name)
    if (entry) {
      entry.priority = Math.max(entry.priority, priority)
      entry.spans.push(span)
    } else {
      grouped.set(token.name, { name: token.name, priority, spans: [span] })
    }
  }

  return [...grouped.values()]
}
