import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FastDrawImage } from './fast-draw-image'

const originalUserAgent = navigator.userAgent

function makeBitmap(): ImageBitmap {
  return { close: vi.fn(), width: 10, height: 10 } as unknown as ImageBitmap
}

function setUserAgent(ua: string): void {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
}

function asChromium(): void {
  ;(window as unknown as Record<string, unknown>).chrome = {}
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (window as unknown as Record<string, unknown>).chrome
  setUserAgent(originalUserAgent)
})

describe('브라우저 감지', () => {
  it('window.chrome가 있으면 chromium으로 감지해야 함', () => {
    asChromium()
    expect(new FastDrawImage().getBrowserType()).toBe('chromium')
  })

  it('Safari UA(Chrome 미포함)는 safari로 감지해야 함', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.0 Safari/605.1.15',
    )
    expect(new FastDrawImage().getBrowserType()).toBe('safari')
  })

  it('Firefox UA는 firefox로 감지해야 함', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    )
    expect(new FastDrawImage().getBrowserType()).toBe('firefox')
  })

  it('알 수 없는 UA는 unknown으로 감지해야 함', () => {
    setUserAgent('SomeUnknownAgent/1.0')
    expect(new FastDrawImage().getBrowserType()).toBe('unknown')
  })
})

describe('loadImage (chromium 경로)', () => {
  let bitmap: ImageBitmap

  beforeEach(() => {
    asChromium()
    bitmap = makeBitmap()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    )
  })

  it('fetch → blob → createImageBitmap로 ImageBitmap을 반환해야 함', async () => {
    const loader = new FastDrawImage()
    const result = await loader.loadImage('a.jpg')

    expect(result).toBe(bitmap)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('캐시가 켜져 있으면 같은 URL은 한 번만 fetch해야 함', async () => {
    const loader = new FastDrawImage()
    await loader.loadImage('a.jpg')
    await loader.loadImage('a.jpg')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('cache:false면 매번 다시 fetch해야 함', async () => {
    const loader = new FastDrawImage()
    await loader.loadImage('a.jpg', { cache: false })
    await loader.loadImage('a.jpg', { cache: false })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('동시에 같은 URL을 요청하면 fetch는 한 번만 일어나야 함', async () => {
    const loader = new FastDrawImage()
    const [a, b] = await Promise.all([
      loader.loadImage('x.jpg'),
      loader.loadImage('x.jpg'),
    ])

    expect(a).toBe(b)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('응답이 ok가 아니면 에러를 던져야 함', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    )
    const loader = new FastDrawImage()

    await expect(loader.loadImage('missing.jpg')).rejects.toThrow(/404/)
  })

  it('blob 변환 후 signal이 abort되면 AbortError를 던져야 함', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        controller.abort()
        return { ok: true, blob: () => Promise.resolve(new Blob()) }
      }),
    )
    const loader = new FastDrawImage()

    await expect(
      loader.loadImage('a.jpg', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('캐시 관리', () => {
  let bitmap: ImageBitmap

  beforeEach(() => {
    asChromium()
    bitmap = makeBitmap()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    )
  })

  it('로드 후 isCached/getCached/getCacheStats가 일치해야 함', async () => {
    const loader = new FastDrawImage()
    await loader.loadImage('a.jpg')

    expect(loader.isCached('a.jpg')).toBe(true)
    expect(loader.getCached('a.jpg')).toBe(bitmap)
    expect(loader.getCacheStats()).toEqual({ size: 1, urls: ['a.jpg'] })
  })

  it('clearCache는 bitmap을 닫고 캐시에서 제거해야 함', async () => {
    const loader = new FastDrawImage()
    await loader.loadImage('a.jpg')

    expect(loader.clearCache('a.jpg')).toBe(true)
    expect(bitmap.close).toHaveBeenCalled()
    expect(loader.isCached('a.jpg')).toBe(false)
  })

  it('캐시에 없는 URL의 clearCache는 false를 반환해야 함', () => {
    const loader = new FastDrawImage()
    expect(loader.clearCache('nope.jpg')).toBe(false)
  })

  it('clearAllCache는 모든 bitmap을 닫고 캐시를 비워야 함', async () => {
    const loader = new FastDrawImage()
    await loader.loadImage('a.jpg')
    await loader.loadImage('b.jpg')

    loader.clearAllCache()

    expect(bitmap.close).toHaveBeenCalledTimes(2)
    expect(loader.getCacheStats().size).toBe(0)
  })
})

describe('preload', () => {
  beforeEach(() => {
    asChromium()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve(makeBitmap())),
    )
  })

  it('모든 이미지를 로드하고 진행 콜백을 호출해야 함', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    )
    const onProgress = vi.fn()
    const loader = new FastDrawImage()

    const map = await loader.preload(['a.jpg', 'b.jpg', 'c.jpg'], {
      concurrency: 2,
      onProgress,
    })

    expect(map.size).toBe(3)
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenLastCalledWith(3, 3)
  })

  it('일부 이미지가 실패해도 나머지는 계속 로드해야 함', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('bad')
          ? Promise.reject(new Error('network error'))
          : Promise.resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob()),
            }),
      ),
    )
    const onProgress = vi.fn()
    const loader = new FastDrawImage()

    const map = await loader.preload(['good.jpg', 'bad.jpg'], { onProgress })

    expect(map.has('good.jpg')).toBe(true)
    expect(map.has('bad.jpg')).toBe(false)
    expect(map.size).toBe(1)
    expect(onProgress).toHaveBeenCalledTimes(2)
  })
})

describe('drawImage', () => {
  let bitmap: ImageBitmap
  let drawSpy: ReturnType<typeof vi.fn>
  let fakeCanvas: HTMLCanvasElement

  beforeEach(() => {
    asChromium()
    bitmap = makeBitmap()
    drawSpy = vi.fn()
    fakeCanvas = {
      getContext: vi.fn(() => ({ drawImage: drawSpy })),
    } as unknown as HTMLCanvasElement
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    )
  })

  it('크기 옵션이 없으면 자연 크기로 그려야 함', async () => {
    const loader = new FastDrawImage()
    const result = await loader.drawImage('a.jpg', {
      canvas: fakeCanvas,
      x: 5,
      y: 10,
    })

    expect(result).toBe(bitmap)
    expect(drawSpy).toHaveBeenCalledWith(bitmap, 5, 10)
  })

  it('width/height가 있으면 리사이즈하여 그려야 함', async () => {
    const loader = new FastDrawImage()
    await loader.drawImage('a.jpg', {
      canvas: fakeCanvas,
      x: 0,
      y: 0,
      width: 200,
      height: 150,
    })

    expect(drawSpy).toHaveBeenCalledWith(bitmap, 0, 0, 200, 150)
  })

  it('소스 사각형이 주어지면 9-인자 형태로 그려야 함', async () => {
    const loader = new FastDrawImage()
    await loader.drawImage('sprite.png', {
      canvas: fakeCanvas,
      sx: 0,
      sy: 0,
      sWidth: 64,
      sHeight: 64,
      x: 100,
      y: 100,
      width: 128,
      height: 128,
    })

    expect(drawSpy).toHaveBeenCalledWith(
      bitmap,
      0,
      0,
      64,
      64,
      100,
      100,
      128,
      128,
    )
  })

  it('문자열 ID로 캔버스를 찾지 못하면 에러를 던져야 함', async () => {
    const loader = new FastDrawImage()
    await expect(
      loader.drawImage('a.jpg', { canvas: 'missing-canvas' }),
    ).rejects.toThrow(/Canvas element not found/)
  })
})
