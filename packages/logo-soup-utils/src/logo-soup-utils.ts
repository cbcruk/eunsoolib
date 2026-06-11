export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface VisualCenter {
  /** 원본 좌표계 기준 시각적 질량 중심 */
  x: number
  y: number
  /** 콘텐츠 박스 중심 대비 오프셋(콘텐츠 좌표계). transform 계산에 쓰임 */
  offsetX: number
  offsetY: number
}

export interface MeasurementResult {
  width: number
  height: number
  contentBox: BoundingBox
  visualCenter: VisualCenter
  /** 0~1, 채움면적비 × 평균불투명도. 미요청 시 undefined */
  pixelDensity?: number
  /** 0~1, 불투명 이미지에서만 측정(배경색 휘도). 투명 이미지는 undefined */
  backgroundLuminance?: number
}

export type RGB = [number, number, number]
export type AlignmentMode =
  | 'bounds'
  | 'visual-center'
  | 'visual-center-x'
  | 'visual-center-y'

/**
 * 픽셀 스캔은 O(픽셀 수)다. 5944×752 같은 원본 로고를 그대로 훑으면
 * 수백만 픽셀을 돌게 되는데, 바운딩 박스/질량중심/밀도 같은 "통계량"은
 * 저해상도에서도 충분히 정확하다. 그래서 총 픽셀을 PIXEL_BUDGET 이하로
 * 줄인 축소본에서 스캔하고, 결과 좌표만 원본 배율로 되돌린다.
 *
 * ratio = sqrt(budget / total) : 가로·세로에 각각 곱하면 면적이 budget이 됨.
 */
const PIXEL_BUDGET = 2_048

export function downsampleDimensions(
  w: number,
  h: number,
): { sw: number; sh: number } {
  const total = w * h
  const ratio = total > PIXEL_BUDGET ? Math.sqrt(PIXEL_BUDGET / total) : 1
  return {
    sw: Math.max(1, Math.round(w * ratio)),
    sh: Math.max(1, Math.round(h * ratio)),
  }
}

// Canvas의 ImageData.data는 [r,g,b,a, r,g,b,a, ...] 바이트 배열이다.
// 이를 Uint32Array로 보면 픽셀 하나가 32비트 한 워드가 되어 읽기가 빠르다.
// 리틀엔디언 환경에서 메모리 바이트 순서가 R,G,B,A이므로 워드로 읽으면
// 비트 배치는 0xAABBGGRR가 된다:
//   a = pixel >>> 24
//   b = (pixel >>> 16) & 0xff
//   g = (pixel >>> 8)  & 0xff
//   r =  pixel         & 0xff
// (대부분의 브라우저/플랫폼이 리틀엔디언이라 라이브러리도 이 가정을 쓴다.)

/** RGBA 바이트 버퍼 → Uint32Array 뷰 (복사 없음) */
export function asUint32(data: Uint8ClampedArray | Uint8Array): Uint32Array {
  return new Uint32Array(data.buffer, data.byteOffset, data.length >> 2)
}

export interface PerimeterAnalysis {
  /** 테두리의 10% 이상이 투명 → 투명 배경 로고로 판단 */
  transparent: boolean
  bgR: number
  bgG: number
  bgB: number
}

/**
 * 로고는 보통 중앙에 놓이고 가장자리는 배경이다. 따라서 이미지 테두리
 * (맨 윗줄·아랫줄·좌우 끝열)만 표본으로 모으면 배경색을 알 수 있다.
 *
 * 방법: 테두리 픽셀을 색 공간 버킷에 투표시키고 최빈 버킷의 평균색을 배경으로 본다.
 *   - SHIFT=5 → 채널당 상위 3비트(8단계)만 사용해 256³ 색을 8³=512 버킷으로 양자화.
 *     약간의 JPEG 노이즈/안티앨리어싱이 있어도 같은 버킷에 모이게 하기 위함.
 *   - 알파<128 픽셀은 "투명 표"로 따로 세고, 투명표가 10%를 넘으면 transparent=true.
 *
 * 호출자가 배경색을 명시하면 이 단계는 건너뛴다.
 */
export function analyzePerimeter(
  data32: Uint32Array,
  sw: number,
  sh: number,
): PerimeterAnalysis {
  const SHIFT = 5
  const LEVELS = 1 << (8 - SHIFT) // 8
  const BUCKETS = LEVELS ** 3 // 512

  const counts = new Uint16Array(BUCKETS)
  const sumR = new Uint32Array(BUCKETS)
  const sumG = new Uint32Array(BUCKETS)
  const sumB = new Uint32Array(BUCKETS)

  let opaque = 0
  let transparent = 0

  const vote = (pixel: number) => {
    const a = pixel >>> 24
    if (a < 128) {
      transparent++
      return
    }
    opaque++
    const r = pixel & 0xff
    const g = (pixel >>> 8) & 0xff
    const b = (pixel >>> 16) & 0xff
    // 채널을 8단계로 줄여 버킷 인덱스 = (r*8 + g)*8 + b
    const key =
      ((r >>> SHIFT) * LEVELS + (g >>> SHIFT)) * LEVELS + (b >>> SHIFT)
    counts[key]++
    sumR[key] += r
    sumG[key] += g
    sumB[key] += b
  }

  // 위/아래 가장자리 행 전체
  const lastRow = (sh - 1) * sw
  for (let x = 0; x < sw; x++) {
    vote(data32[x])
    if (sh > 1) vote(data32[lastRow + x])
  }
  // 좌/우 가장자리 열 (모서리 중복 제외하려고 y=1..sh-2)
  const lastCol = sw - 1
  for (let y = 1; y < sh - 1; y++) {
    const row = y * sw
    vote(data32[row])
    if (sw > 1) vote(data32[row + lastCol])
  }

  const totalPerimeter = opaque + transparent
  const isTransparent = totalPerimeter > 0 && transparent > totalPerimeter * 0.1

  // 최빈 버킷 찾기
  let bestCount = 0
  let bestIdx = 0
  for (let i = 0; i < BUCKETS; i++) {
    if (counts[i] > bestCount) {
      bestCount = counts[i]
      bestIdx = i
    }
  }

  return {
    transparent: isTransparent,
    bgR: bestCount ? Math.round(sumR[bestIdx] / bestCount) : 255,
    bgG: bestCount ? Math.round(sumG[bestIdx] / bestCount) : 255,
    bgB: bestCount ? Math.round(sumB[bestIdx] / bestCount) : 255,
  }
}

export interface ScanOptions {
  /** 원본 이미지 크기(결과 좌표를 여기에 맞춰 되돌림) */
  width: number
  height: number
  /** 다운샘플된 RGBA를 Uint32로 본 것 */
  data32: Uint32Array
  /** 다운샘플 크기 */
  sw: number
  sh: number
  /** 콘텐츠 판별 대비 임계값(채널당). 기본 10 */
  contrastThreshold?: number
  /** 밀도 계산 포함 여부 */
  includeDensity?: boolean
  /** 배경색을 강제 지정. 없으면 analyzePerimeter로 추정 */
  backgroundColor?: RGB
}

/**
 * 한 번의 순회로 네 가지를 동시에 구한다(캐시 효율). 픽셀마다:
 *   1) 배경이면 건너뜀
 *   2) 콘텐츠면 bbox(min/max XY) 갱신
 *   3) 질량중심용 가중합 누적
 *   4) 밀도용 채움픽셀 수·불투명도 누적
 *
 * 배경 판별에는 두 모드가 있다:
 *   - 투명 로고(alphaOnly): 알파만으로 판단. 가중치 = a²(불투명할수록 강하게).
 *   - 불투명 로고(색 키잉): 배경색과의 색거리²(distSq)가 임계 미만이면 배경.
 *     가중치 = distSq × a.
 *
 * ※ 시각중심 가중치가 "색거리의 제곱"인 이유:
 *   질량중심은 "잉크가 진하게 몰린 곳"을 중심으로 잡아야 한다. 색거리를 제곱하면
 *   배경과 또렷이 대비되는 픽셀(진한 글자/아이콘)이 가중치를 압도적으로 갖고,
 *   배경에 가까운 흐린 안티앨리어싱 픽셀은 거의 무시된다. 즉 "눈에 띄는 부분"이
 *   중심을 지배하게 만드는 장치다.
 *   (블로그 글은 sqrt(거리)라 서술했지만 실제 출하 코드는 거리²이다. sqrt는
 *    여기가 아니라 아래 density의 opacity 계산에 쓰인다.)
 */
export function scanPixels(opts: ScanOptions): MeasurementResult {
  const {
    width: w,
    height: h,
    data32,
    sw,
    sh,
    contrastThreshold = 10,
    includeDensity = false,
    backgroundColor,
  } = opts

  // 다운샘플 좌표 → 원본 좌표 배율
  const scaleX = w / sw
  const scaleY = h / sh

  // 색거리 비교는 sqrt 없이 제곱끼리 비교한다(연산 절약).
  // 채널 임계 t를 RGB 3축에 적용 → 임계 제곱거리 = t²·3
  const contrastDistanceSq = contrastThreshold * contrastThreshold * 3

  // 배경 결정: 명시값 우선, 없으면 테두리 분석
  let bgR: number
  let bgG: number
  let bgB: number
  let alphaOnly: boolean

  if (backgroundColor) {
    ;[bgR, bgG, bgB] = backgroundColor
    alphaOnly = false
  } else {
    const p = analyzePerimeter(data32, sw, sh)
    if (p.transparent) {
      alphaOnly = true
      bgR = bgG = bgB = 0
    } else {
      alphaOnly = false
      bgR = p.bgR
      bgG = p.bgG
      bgB = p.bgB
    }
  }

  let minX = sw
  let minY = sh
  let maxX = 0
  let maxY = 0

  let totalWeight = 0
  let weightedX = 0
  let weightedY = 0

  let filledPixels = 0
  let totalWeightedOpacity = 0

  const count = sw * sh
  for (let i = 0; i < count; i++) {
    const pixel = data32[i]
    const a = pixel >>> 24

    // 거의 투명하면 콘텐츠 아님
    if (a <= contrastThreshold) continue

    let weight: number
    let opacity: number

    if (alphaOnly) {
      // 투명 배경: 알파 자체가 콘텐츠 신호. 제곱으로 진한 픽셀을 강조.
      weight = a * a
      opacity = a
    } else {
      const r = pixel & 0xff
      const g = (pixel >>> 8) & 0xff
      const b = (pixel >>> 16) & 0xff
      const dr = r - bgR
      const dg = g - bgG
      const db = b - bgB
      const distSq = dr * dr + dg * dg + db * db

      // 배경색과 충분히 다르지 않으면 배경으로 간주
      if (distSq < contrastDistanceSq) continue

      // 질량중심 가중치: 색거리² × 알파 (대비 강한 잉크가 중심을 지배)
      weight = distSq * a
      // 밀도용 불투명도: 알파와 색거리 중 작은 값을 채택.
      // 반투명하지만 색이 진한 픽셀이 과대평가되지 않도록 둘의 하한을 씀.
      opacity = Math.min(a, Math.sqrt(distSq))
    }

    // 1차원 인덱스 i → 2차원 좌표
    const x = i % sw
    const y = (i - x) / sw

    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y

    // 픽셀 중심(+0.5)을 무게중심에 반영
    totalWeight += weight
    weightedX += (x + 0.5) * weight
    weightedY += (y + 0.5) * weight

    filledPixels++
    totalWeightedOpacity += opacity
  }

  // 콘텐츠가 하나도 없으면 전체를 콘텐츠로 폴백
  if (minX > maxX || minY > maxY) {
    return {
      width: w,
      height: h,
      contentBox: { x: 0, y: 0, width: w, height: h },
      visualCenter: { x: w / 2, y: h / 2, offsetX: 0, offsetY: 0 },
      pixelDensity: includeDensity ? 0.5 : undefined,
    }
  }

  // bbox를 원본 좌표로 환산 (시작은 floor, 끝은 ceil로 콘텐츠를 깎지 않게)
  const cbX = Math.floor(minX * scaleX)
  const cbY = Math.floor(minY * scaleY)
  const contentBox: BoundingBox = {
    x: cbX,
    y: cbY,
    width: Math.min(Math.ceil((maxX + 1) * scaleX), w) - cbX,
    height: Math.min(Math.ceil((maxY + 1) * scaleY), h) - cbY,
  }

  // 시각적 질량중심(원본 좌표) + 콘텐츠 박스 중심 대비 오프셋
  let visualCenter: VisualCenter
  if (totalWeight === 0) {
    const cx = contentBox.x + contentBox.width / 2
    const cy = contentBox.y + contentBox.height / 2
    visualCenter = { x: cx, y: cy, offsetX: 0, offsetY: 0 }
  } else {
    const gx = (weightedX / totalWeight) * scaleX
    const gy = (weightedY / totalWeight) * scaleY
    const localX = gx - contentBox.x
    const localY = gy - contentBox.y
    visualCenter = {
      x: gx,
      y: gy,
      // 양수면 시각중심이 기하중심보다 오른쪽/아래에 치우쳤다는 뜻
      offsetX: localX - contentBox.width / 2,
      offsetY: localY - contentBox.height / 2,
    }
  }

  const result: MeasurementResult = {
    width: w,
    height: h,
    contentBox,
    visualCenter,
  }

  // 배경휘도(불투명 이미지만): ITU-R BT.601 가중치. 0~1로 정규화.
  // 조사 착시 보정(아래)에서 "배경이 얼마나 어두운가"로 쓰인다.
  if (!alphaOnly) {
    result.backgroundLuminance = (bgR * 299 + bgG * 587 + bgB * 114) / 255000
  }

  // 밀도 = 채움면적비 × 평균불투명도
  //   coverageRatio  : bbox 안에서 콘텐츠 픽셀이 차지하는 비율(얼마나 빽빽한가)
  //   averageOpacity : 콘텐츠 픽셀의 평균 진하기
  // 둘을 곱해 "면적도 넓고 진하기도 한" 로고일수록 높은 값이 나온다.
  if (includeDensity) {
    const scanArea = (maxX - minX + 1) * (maxY - minY + 1)
    if (scanArea === 0) {
      result.pixelDensity = 0.5
    } else {
      const coverageRatio = filledPixels / scanArea
      const averageOpacity =
        filledPixels > 0 ? totalWeightedOpacity / 255 / filledPixels : 0
      result.pixelDensity = coverageRatio * averageOpacity
    }
  }

  return result
}

export interface NormalizeOptions {
  baseSize?: number // 기본 48
  scaleFactor?: number // 기본 0.5
  densityFactor?: number // 기본 0(보정 없음). 라이브러리 컴포넌트 기본은 0.5
}

/**
 * 측정 결과를 최종 렌더 치수로 변환한다. 세 단계가 순서대로 곱해진다.
 */
export function calculateNormalizedDimensions(
  m: MeasurementResult,
  {
    baseSize = 48,
    scaleFactor = 0.5,
    densityFactor = 0,
  }: NormalizeOptions = {},
): { width: number; height: number } {
  const cw = m.contentBox?.width ?? m.width
  const ch = m.contentBox?.height ?? m.height
  if (cw === 0 || ch === 0) return { width: baseSize, height: baseSize }

  const aspectRatio = cw / ch

  // ── (1) PINF : 비례 정규화 ──────────────────────────────
  //   normalizedWidth = (w/h)^scaleFactor × baseSize
  //
  // 직관: scaleFactor=0이면 (w/h)^0=1이라 모든 로고가 같은 너비가 되고,
  // scaleFactor=1이면 너비가 종횡비에 비례해 결국 높이가 통일된다.
  // 둘 다 한쪽 극단(정사각형이 거대해지거나, 와이드가 거대해짐)이라 보기 싫다.
  // 0.5(제곱근)는 그 중간으로, 종횡비를 "감쇠"시켜 16:1 로고도 4배 너비에 그친다.
  // 즉 두 나쁜 해 사이를 거듭제곱으로 보간해 좋은 해를 만든다.
  let width = aspectRatio ** scaleFactor * baseSize
  let height = width / aspectRatio

  // ── (2) 조사 착시 보정(Helmholtz irradiation) ───────────
  //   어두운 배경 위의 밝은 형상은 실제보다 커/굵어 보인다(빛 번짐). 효과는
  //   배경이 어두울수록(darkness↑), 형상이 빽빽할수록(density↑) 강하다.
  //   그래서 darkness×density에 비례해 살짝(최대 8%) 줄여 지각 크기를 맞춘다.
  //   배경휘도를 아는 불투명 이미지에만 적용(투명 로고는 배경이 정해지지 않음).
  if (m.backgroundLuminance !== undefined) {
    const darkness = 1 - m.backgroundLuminance // 0(흰 배경)~1(검은 배경)
    const density = m.pixelDensity ?? 0.5
    const irradiationScale = 1 - darkness * density * 0.08
    width *= irradiationScale
    height *= irradiationScale
  }

  // ── (3) 밀도 보정 ───────────────────────────────────────
  //   같은 치수라도 빽빽한 로고는 무겁게, 얇은 로고는 가볍게 보인다.
  //   기준밀도(0.35)보다 진하면 축소, 옅으면 확대한다.
  //   - densityRatio = density / 0.35
  //   - 역수(1/ratio)를 취해 "진할수록 작게" 만들고,
  //   - 지수 (densityFactor×0.5)로 보정 강도를 감쇠(과보정 방지),
  //   - 마지막에 0.5~2배로 클램프해 극단을 막는다.
  //   densityFactor=0이면 이 블록은 통째로 생략된다.
  if (densityFactor > 0 && m.pixelDensity !== undefined) {
    const referenceDensity = 0.35
    const densityRatio = m.pixelDensity / referenceDensity
    const densityScale = (1 / densityRatio) ** (densityFactor * 0.5)
    const clamped = Math.max(0.5, Math.min(2, densityScale))
    width *= clamped
    height *= clamped
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * 측정 때 구한 오프셋(콘텐츠 좌표계)을 렌더 치수 배율로 환산해 translate를 만든다.
 *
 * - 부호 반전: offset이 "시각중심이 오른쪽/아래로 치우친 정도"이므로,
 *   그만큼 왼쪽/위로 당겨야 시각중심이 자리(레이아웃 슬롯의 가운데)에 온다.
 * - 0.5px 미만의 미세 이동은 무시(불필요한 transform/리페인트 방지).
 *
 * alignBy:
 *   "bounds"          → 보정 없음(기하중심 그대로)
 *   "visual-center"   → 가로·세로 모두
 *   "visual-center-x" → 가로만
 *   "visual-center-y" → 세로만(라이브러리 기본값)
 */
export function getVisualCenterTransform(
  m: MeasurementResult,
  renderWidth: number,
  renderHeight: number,
  alignBy: AlignmentMode = 'visual-center-y',
): string | undefined {
  if (alignBy === 'bounds' || !m.visualCenter) return undefined

  const cw = m.contentBox?.width || m.width
  const ch = m.contentBox?.height || m.height
  const scaleX = renderWidth / cw
  const scaleY = renderHeight / ch

  const useX = alignBy === 'visual-center' || alignBy === 'visual-center-x'
  const useY = alignBy === 'visual-center' || alignBy === 'visual-center-y'

  const offsetX = useX ? -m.visualCenter.offsetX * scaleX : 0
  const offsetY = useY ? -m.visualCenter.offsetY * scaleY : 0

  if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
    const rx = Math.round(offsetX * 10) / 10
    const ry = Math.round(offsetY * 10) / 10
    return `translate(${rx}px, ${ry}px)`
  }
  return undefined
}
