import { Parser } from 'acorn'
import jsx from 'acorn-jsx'

const JsxParser = Parser.extend(jsx())

/** AST를 훑어 JSX 노드가 하나라도 있는지 본다. */
function containsJsxNode(node: unknown): boolean {
  if (node === null || typeof node !== 'object') return false

  if (Array.isArray(node)) {
    return node.some(containsJsxNode)
  }

  const type = (node as { type?: unknown }).type

  if (typeof type === 'string' && type.startsWith('JSX')) return true

  return Object.entries(node).some(
    ([key, value]) => key !== 'type' && containsJsxNode(value),
  )
}

/**
 * 자바스크립트 소스에 JSX 문법이 있는지 판별한다.
 *
 * 문자열이나 주석 안의 `<div />`는 세지 않도록 파서로 판별한다. 프래그먼트
 * (`<>…</>`)만 쓴 파일도 JSX로 본다.
 *
 * @param source - 파일 내용
 * @returns JSX가 있으면 `true`
 * @throws 파싱하지 못할 때. Flow나 데코레이터처럼 acorn이 모르는 문법이면 던진다
 *
 * @example
 * ```ts
 * import { hasJsx } from '@cbcruk/git-mv-ts'
 *
 * hasJsx('const a = <>hi</>') // true
 * hasJsx('const a = b < c')   // false
 * ```
 */
export function hasJsx(source: string): boolean {
  const ast = JsxParser.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowHashBang: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
  })

  return containsJsxNode(ast)
}
