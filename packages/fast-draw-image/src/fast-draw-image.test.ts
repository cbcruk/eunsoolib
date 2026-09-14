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

/** Stub `fetch` with a load that stays pending until `resolve` is called or its signal aborts. */
function stubDeferredFetch() {
  const signals: AbortSignal[] = []
  const resolvers: Array<() => void> = []

  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((resolve, reject) => {
          const signal = init?.signal ?? undefined
          if (signal) {
            signals.push(signal)
            signal.addEventListener('abort', () =>
              reject(new DOMException('fetch aborted', 'AbortError')),
            )
          }
          resolvers.push(() =>
            resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
          )
        }),
    ),
  )

  return {
    signals,
    resolveAll: () => resolvers.forEach((resolve) => resolve()),
  }
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

  it('동시 요청 중 첫 호출만 abort해도 다른 호출은 계속 로드되어야 함', async () => {
    const { signals, resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()
    const first = new AbortController()

    const a = loader.loadImage('x.jpg', { signal: first.signal })
    const b = loader.loadImage('x.jpg')

    first.abort()
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })

    expect(signals[0].aborted).toBe(false)
    resolveAll()

    await expect(b).resolves.toBe(bitmap)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('동시 요청 중 나중 호출의 signal로도 그 호출을 abort할 수 있어야 함', async () => {
    const { resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()
    const second = new AbortController()

    const a = loader.loadImage('x.jpg')
    const b = loader.loadImage('x.jpg', { signal: second.signal })

    second.abort()
    await expect(b).rejects.toMatchObject({ name: 'AbortError' })

    resolveAll()
    await expect(a).resolves.toBe(bitmap)
  })

  it('동시 요청이 모두 abort되면 실제 로드도 abort되어야 함', async () => {
    const { signals } = stubDeferredFetch()
    const loader = new FastDrawImage()
    const first = new AbortController()
    const second = new AbortController()

    const a = loader.loadImage('x.jpg', { signal: first.signal })
    const b = loader.loadImage('x.jpg', { signal: second.signal })

    first.abort()
    expect(signals[0].aborted).toBe(false)

    second.abort()
    expect(signals[0].aborted).toBe(true)

    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    await expect(b).rejects.toMatchObject({ name: 'AbortError' })
    expect(loader.isCached('x.jpg')).toBe(false)
  })

  it('모두 abort된 뒤 같은 URL을 다시 요청하면 새로 로드해야 함', async () => {
    const { resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()
    const controller = new AbortController()

    const a = loader.loadImage('x.jpg', { signal: controller.signal })
    controller.abort()
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })

    const b = loader.loadImage('x.jpg')
    resolveAll()

    await expect(b).resolves.toBe(bitmap)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('이미 abort된 signal을 넘기면 로드를 시작하지 않고 AbortError를 던져야 함', async () => {
    const loader = new FastDrawImage()

    await expect(
      loader.loadImage('x.jpg', { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('동시 요청 중 하나라도 cache:true면 결과를 캐시해야 함', async () => {
    const { resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()

    const a = loader.loadImage('x.jpg', { cache: false })
    const b = loader.loadImage('x.jpg', { cache: true })
    resolveAll()
    await Promise.all([a, b])

    expect(loader.isCached('x.jpg')).toBe(true)
  })

  it('동시 요청이 모두 cache:false면 결과를 캐시하지 않아야 함', async () => {
    const { resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()

    const a = loader.loadImage('x.jpg', { cache: false })
    const b = loader.loadImage('x.jpg', { cache: false })
    resolveAll()
    await Promise.all([a, b])

    expect(loader.isCached('x.jpg')).toBe(false)
  })

  it('cache:true 호출이 abort되고 cache:false 호출만 남으면 캐시하지 않아야 함', async () => {
    const { resolveAll } = stubDeferredFetch()
    const loader = new FastDrawImage()
    const controller = new AbortController()

    const a = loader.loadImage('x.jpg', { signal: controller.signal })
    const b = loader.loadImage('x.jpg', { cache: false })
    controller.abort()
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })

    resolveAll()
    await expect(b).resolves.toBe(bitmap)
    expect(loader.isCached('x.jpg')).toBe(false)
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

  it('width만 주면 원본 비율로 height를 계산해 그려야 함', async () => {
    bitmap = {
      close: vi.fn(),
      width: 400,
      height: 300,
    } as unknown as ImageBitmap
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    const loader = new FastDrawImage()
    await loader.drawImage('a.jpg', { canvas: fakeCanvas, width: 200 })

    expect(drawSpy).toHaveBeenCalledWith(bitmap, 0, 0, 200, 150)
  })

  it('height만 주면 원본 비율로 width를 계산해 그려야 함', async () => {
    bitmap = {
      close: vi.fn(),
      width: 400,
      height: 300,
    } as unknown as ImageBitmap
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    const loader = new FastDrawImage()
    await loader.drawImage('a.jpg', {
      canvas: fakeCanvas,
      x: 1,
      y: 2,
      height: 60,
    })

    expect(drawSpy).toHaveBeenCalledWith(bitmap, 1, 2, 80, 60)
  })

  it('소스 사각형과 width만 주면 소스 사각형 비율로 height를 계산해야 함', async () => {
    const loader = new FastDrawImage()
    await loader.drawImage('sprite.png', {
      canvas: fakeCanvas,
      sx: 0,
      sy: 0,
      sWidth: 64,
      sHeight: 32,
      width: 128,
    })

    expect(drawSpy).toHaveBeenCalledWith(bitmap, 0, 0, 64, 32, 0, 0, 128, 64)
  })

  it('소스 사각형만 주면 소스 크기로 그려야 함', async () => {
    const loader = new FastDrawImage()
    await loader.drawImage('sprite.png', {
      canvas: fakeCanvas,
      sx: 8,
      sy: 8,
      sWidth: 64,
      sHeight: 32,
    })

    expect(drawSpy).toHaveBeenCalledWith(bitmap, 8, 8, 64, 32, 0, 0, 64, 32)
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
