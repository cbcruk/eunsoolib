/**
 * 정답 단어를 `btoa`/`atob` 기반 Base64로 변환한다.
 *
 * URL 등에서 정답이 한눈에 보이지 않게 하는 용도일 뿐 암호화가 아니다.
 *
 * @example
 * ```ts
 * import { WordleCodec } from '@cbcruk/wordle'
 *
 * const encoded = WordleCodec.encode('apple')
 * WordleCodec.decode(encoded) // 'apple'
 * ```
 */
export class WordleCodec {
  /**
   * 문자열을 Base64로 인코딩한다.
   *
   * @throws Latin-1 범위 밖의 문자(한글 등)가 있으면 `btoa`가 예외를 던진다.
   */
  static encode(answer: string): string {
    return btoa(answer)
  }

  /**
   * Base64 문자열을 원래 문자열로 디코딩한다.
   *
   * @throws 올바른 Base64가 아니면 `atob`가 예외를 던진다.
   */
  static decode(encoded: string): string {
    return atob(encoded)
  }
}
