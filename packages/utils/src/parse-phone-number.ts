/**
 * 하이픈 없는 11자리 휴대폰 번호를 세 부분으로 분해
 *
 * @param value - 숫자 11자리 문자열 (예: `'01012345678'`)
 * @returns 앞자리(`prefix`) / 중간(`middle`) / 뒷자리(`suffix`)
 * @throws 11자리 숫자 형식이 아닌 경우
 * @example
 * ```ts
 * parsePhoneNumber('01012345678')
 * // { prefix: '010', middle: '1234', suffix: '5678' }
 * ```
 */
export function parsePhoneNumber(value: string) {
  const match = value.match(/^(\d{3})(\d{4})(\d{4})$/)

  if (!match) {
    throw new Error('유효하지 않은 전화번호 형식입니다')
  }

  const [, prefix, middle, suffix] = match

  return {
    prefix,
    middle,
    suffix,
  }
}
