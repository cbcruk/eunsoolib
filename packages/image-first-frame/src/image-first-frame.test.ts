import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  imageFirstFrameToBlob,
  imageFirstFrameToCanvas,
} from './image-first-frame'

interface FakeCtx {
  fillStyle: string
  fillRect: ReturnType<typeof vi.fn>
  drawImage: ReturnType<typeof vi.fn>
}

interface FakeCanvas {
  width: number
  height: number
  _ctx: FakeCtx | null
  getContext: ReturnType<typeof vi.fn>
  toBlob: ReturnType<typeof vi.fn>
}

function makeBitmap(width = 32, height = 24): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap
}

let canvas: FakeCanvas
const realCreateElement = document.createElement.bind(document)

function makeCanvas(ctx: FakeCtx | null): FakeCanvas {
  return {
    width: 0,
    height: 0,
    _ctx: ctx,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb: BlobCallback, type?: string) =>
      cb(new Blob([], { type: type ?? '' })),
    ),
  }
}

beforeEach(() => {
  canvas = makeCanvas({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() })
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve(makeBitmap())),
  )
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'canvas'
      ? (canvas as unknown as HTMLElement)
      : realCreateElement(tag),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('imageFirstFrameToCanvas', () => {
  it('source로 첫 프레임을 디코딩하고 비트맵 크기로 캔버스를 잡아 그려야 함', async () => {
    const file = new File([], 'a.gif', { type: 'image/gif' })
    const result = await imageFirstFrameToCanvas(file)

    expect(createImageBitmap).toHaveBeenCalledWith(file)
    expect(result.width).toBe(32)
    expect(result.height).toBe(24)
    expect(canvas._ctx!.drawImage).toHaveBeenCalled()
  })

  it('디코딩한 비트맵을 닫아야 함', async () => {
    const bitmap = makeBitmap()
    vi.mocked(createImageBitmap).mockResolvedValueOnce(bitmap)
    await imageFirstFrameToCanvas(new Blob())
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('png(기본)은 배경을 채우지 않아 알파를 보존해야 함', async () => {
    await imageFirstFrameToCanvas(new Blob())
    expect(canvas._ctx!.fillRect).not.toHaveBeenCalled()
  })

  it('jpeg은 흰 배경을 그린 뒤 이미지를 그려야 함', async () => {
    await imageFirstFrameToCanvas(new Blob(), { type: 'image/jpeg' })
    expect(canvas._ctx!.fillStyle).toBe('#fff')
    expect(canvas._ctx!.fillRect).toHaveBeenCalledWith(0, 0, 32, 24)
  })

  it('background를 주면 포맷과 무관하게 평탄화해야 함', async () => {
    await imageFirstFrameToCanvas(new Blob(), {
      type: 'image/webp',
      background: '#000',
    })
    expect(canvas._ctx!.fillStyle).toBe('#000')
    expect(canvas._ctx!.fillRect).toHaveBeenCalled()
  })

  it('2D 컨텍스트가 없으면 에러를 던져야 함', async () => {
    canvas = makeCanvas(null)
    await expect(imageFirstFrameToCanvas(new Blob())).rejects.toThrow(
      /2D context unavailable/,
    )
  })

  it('createImageBitmap 미지원 환경이면 에러를 던져야 함', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    await expect(imageFirstFrameToCanvas(new Blob())).rejects.toThrow(
      /not supported/,
    )
  })
})

describe('imageFirstFrameToBlob', () => {
  it('지정한 type/quality로 toBlob을 호출하고 Blob을 반환해야 함', async () => {
    const blob = await imageFirstFrameToBlob(new Blob(), {
      type: 'image/jpeg',
      quality: 0.8,
    })

    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.8,
    )
    expect(blob.type).toBe('image/jpeg')
  })

  it('type 생략 시 png·quality 0.92를 기본으로 써야 함', async () => {
    await imageFirstFrameToBlob(new Blob())
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png',
      0.92,
    )
  })

  it('toBlob이 null을 주면 reject해야 함', async () => {
    canvas.toBlob.mockImplementationOnce((cb: BlobCallback) => cb(null))
    await expect(imageFirstFrameToBlob(new Blob())).rejects.toThrow(
      /toBlob failed/,
    )
  })
})
