import type { TextMatchOptions } from './types'

/**
 * container 하위 텍스트 노드를 TreeWalker로 순회하며 pattern과 일치하는 Range들을 만든다.
 * DOM을 다시 쓰지 않으므로 React 트리에 영향이 없다. Shadow DOM 경계는 넘지 않는다.
 */
export function findTextMatches(
  container: Node | null,
  pattern: string | RegExp,
  options: TextMatchOptions = {},
): Range[] {
  if (!container) return []
  if (typeof pattern === 'string' && pattern.length === 0) return []
  const { caseSensitive = false, wholeWord = false } = options

  let regex: RegExp
  if (pattern instanceof RegExp) {
    regex = pattern.global
      ? pattern
      : new RegExp(pattern.source, pattern.flags + 'g')
  } else {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const body = wholeWord ? `\\b${escaped}\\b` : escaped
    regex = new RegExp(body, caseSensitive ? 'g' : 'gi')
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const ranges: Range[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? ''
    if (!text) continue
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      if (m[0].length === 0) {
        regex.lastIndex++
        continue
      }
      const r = document.createRange()
      r.setStart(node, m.index)
      r.setEnd(node, m.index + m[0].length)
      ranges.push(r)
    }
  }
  return ranges
}
