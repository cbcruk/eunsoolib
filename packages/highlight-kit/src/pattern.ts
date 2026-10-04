/**
 * Shared helpers for turning literal string patterns into RegExp sources.
 */

/** Escape every RegExp metacharacter in `literal` so it matches itself. */
export function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a RegExp source matching `literal` verbatim.
 *
 * @param literal - Text to match
 * @param wholeWord - Wrap the source in `\b` so it only matches whole words
 */
export function literalSource(literal: string, wholeWord = false): string {
  const escaped = escapeRegExp(literal)
  return wholeWord ? `\\b${escaped}\\b` : escaped
}

/** Drop a flag from a RegExp flag string. */
export function withoutFlag(flags: string, flag: string): string {
  return flags.replace(flag, '')
}
