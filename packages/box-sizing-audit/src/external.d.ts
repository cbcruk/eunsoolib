declare module 'pixelmatch' {
  export default function pixelmatch(
    img1: Uint8Array | Uint8ClampedArray,
    img2: Uint8Array | Uint8ClampedArray,
    output: Uint8Array | Uint8ClampedArray | undefined,
    width: number,
    height: number,
    options?: { threshold?: number; includeAA?: boolean },
  ): number
}

declare module 'pngjs' {
  export class PNG {
    width: number
    height: number
    data: Buffer
    constructor(options?: { width?: number; height?: number })
    static sync: {
      read(buffer: Buffer): PNG
      write(png: PNG): Buffer
    }
  }
}
