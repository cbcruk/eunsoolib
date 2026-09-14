/**
 * 정답 단어를 UTF-8 바이트의 Base64로 변환한다.
 *
 * `TextEncoder`로 UTF-8 바이트를 만든 뒤 `btoa`로 인코딩하므로 한글처럼 Latin-1 밖의 문자도 다룰 수 있다.
 * ASCII 단어는 `btoa(answer)`와 같은 결과가 나온다.
 * URL 등에서 정답이 한눈에 보이지 않게 하는 용도일 뿐 암호화가 아니다.
 *
 * @example
 * ```ts
 * import { WordleCodec } from '@cbcruk/wordle'
 *
 * const encoded = WordleCodec.encode('apple')
 * WordleCodec.decode(encoded) // 'apple'
 *
 * WordleCodec.decode(WordleCodec.encode('사과나무숲')) // '사과나무숲'
 * ```
 */
export class WordleCodec {
  /** 문자열을 UTF-8 바이트의 Base64로 인코딩한다. */
  static encode(answer: string): string {
    const bytes = new TextEncoder().encode(answer)
    let binary = ''

    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }

    return btoa(binary)
  }

  /**
   * {@link WordleCodec.encode}로 만든 Base64 문자열을 원래 문자열로 디코딩한다.
   *
   * @throws 올바른 Base64가 아니면 `atob`가 예외를 던진다.
   */
  static decode(encoded: string): string {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

    return new TextDecoder().decode(bytes)
  }
}
