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
