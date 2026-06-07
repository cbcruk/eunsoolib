declare module 'libheif-js/wasm-bundle' {
  /** libheif가 디코딩한 단일 이미지 핸들. */
  export interface HeifImage {
    get_width(): number
    get_height(): number
    /** RGBA 버퍼로 디코딩해 `callback`으로 결과를 전달한다. */
    display(
      target: { data: Uint8ClampedArray; width: number; height: number },
      callback: (result: ImageData | null) => void,
    ): void
  }

  export interface HeifDecoder {
    decode(buffer: Uint8Array): HeifImage[]
  }

  export interface HeifModule {
    HeifDecoder: new () => HeifDecoder
  }

  const libheif: HeifModule
  export default libheif
}
