/**
 * 하이픈 없는 11자리 휴대폰 번호를 세 부분으로 분해한다.
 *
 * 앞자리는 휴대폰 식별번호인 `010`·`011`·`016`·`017`·`018`·`019`만 허용한다.
 *
 * @param value - `01X`로 시작하는 숫자 11자리 문자열 (예: `'01012345678'`)
 * @returns 앞자리(`prefix`) / 중간(`middle`) / 뒷자리(`suffix`)
 * @throws 숫자 11자리가 아니거나 앞자리가 휴대폰 식별번호가 아니면 `Error`
 * @example
 * ```ts
 * import { parsePhoneNumber } from '@cbcruk/utils'
 *
 * parsePhoneNumber('01012345678')
 * // { prefix: '010', middle: '1234', suffix: '5678' }
 * ```
 */
export function parsePhoneNumber(value: string): {
  prefix: string
  middle: string
  suffix: string
} {
  const match = value.match(/^(01[016789])(\d{4})(\d{4})$/)

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
