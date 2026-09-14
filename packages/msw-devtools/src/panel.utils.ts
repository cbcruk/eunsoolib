import type { Override } from './types'

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

/**
 * 패널이 문자열로 마크업을 만들기 때문에 필요한 이스케이프.
 *
 * 텍스트 자리와 큰따옴표로 감싼 속성 자리 양쪽에 안전하다. 오버라이드의 path와
 * 시나리오 이름은 사용자가 넣은 값이라 그대로 끼워 넣을 수 없다.
 *
 * @param value - 마크업에 끼워 넣을 문자열.
 * @returns 이스케이프된 문자열.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ENTITIES[char] ?? char)
}

/**
 * 목록 행 오른쪽에 붙는 짧은 라벨.
 *
 * 꺼진 오버라이드는 빈 문자열이라 행이 조용해지고, 켜진 것만 상태를 드러낸다.
 *
 * @param override - 대상 오버라이드.
 * @returns `json`이면 상태 코드, 아니면 모드를 줄인 말. 꺼져 있으면 빈 문자열.
 */
export function overrideTag(override: Override): string {
  if (!override.enabled) return ''
  if (override.mode === 'json') return String(override.status)

  return override.mode === 'passthrough' ? 'pass' : 'error'
}
