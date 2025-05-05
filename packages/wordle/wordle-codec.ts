export class WordleCodec {
  static encode(answer: string): string {
    return btoa(answer)
  }

  static decode(encoded: string): string {
    return atob(encoded)
  }
}
