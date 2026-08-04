/**
 * `min` 이상 `max` 이하의 정수를 무작위로 반환 (양 끝 포함)
 *
 * @param range.min - 최솟값 (포함)
 * @param range.max - 최댓값 (포함)
 * @returns `min`과 `max` 사이의 임의의 정수
 * @example
 * ```ts
 * getRandomNumber({ min: 1, max: 6 }) // 1 ~ 6 중 하나
 * ```
 */
export function getRandomNumber({ min, max }: { min: number; max: number }) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
