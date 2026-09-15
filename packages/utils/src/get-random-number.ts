/**
 * `min` 이상 `max` 이하의 정수를 무작위로 반환한다(양 끝 포함).
 *
 * `Math.random` 기반이라 보안 용도(토큰·비밀번호 생성 등)에는 적합하지 않다.
 *
 * @param range.min - 최솟값(포함). 정수
 * @param range.max - 최댓값(포함). `min` 이상의 정수
 * @returns `min`과 `max` 사이의 임의의 정수
 * @throws `min`이나 `max`가 정수가 아니거나(`NaN`·`Infinity` 포함) `min > max`이면 `RangeError`
 * @example
 * ```ts
 * import { getRandomNumber } from '@cbcruk/utils'
 *
 * getRandomNumber({ min: 1, max: 6 }) // 1 ~ 6 중 하나
 * getRandomNumber({ min: 3, max: 3 }) // 3
 * ```
 */
export function getRandomNumber({
  min,
  max,
}: {
  min: number
  max: number
}): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(
      `min과 max는 정수여야 합니다 (받은 값: min=${min}, max=${max})`,
    )
  }

  if (min > max) {
    throw new RangeError(
      `min은 max보다 클 수 없습니다 (받은 값: min=${min}, max=${max})`,
    )
  }

  return Math.floor(Math.random() * (max - min + 1)) + min
}
