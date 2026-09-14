# @eunsoolib/logo-soup-utils

`react-logo-soup`의 로고 정규화 알고리즘을 **환경 비의존 순수 함수**로 재구성한 패키지입니다.

서로 다른 종횡비·밀도·배경을 가진 로고들을 한 줄에 나열할 때 "지각적으로 같은 크기"로 맞추기 위한 측정·정규화 수학만 다룹니다. 픽셀 데이터 획득(Canvas `getImageData`, node-canvas, sharp 등)은 **호출자 책임**이며, 여기서는 RGBA 버퍼가 주어졌을 때의 순수 계산만 수행합니다.

> 각 단계의 공식과 유도·직관은 [ALGORITHM.md](./ALGORITHM.md)에 LaTeX로 정리되어 있습니다.

## 설치

```bash
pnpm add @eunsoolib/logo-soup-utils
```

의존성이 없는 순수 함수라 브라우저·Node·Worker 어디서든 동작합니다. RGBA 픽셀을 얻는 방법만 환경에 맞게 준비하면 됩니다.

## 사용법

브라우저에서 이미지 한 장을 측정하고 렌더 크기와 시각중심 보정값을 구하는 예시입니다.

```ts
import {
  asUint32,
  calculateNormalizedDimensions,
  downsampleDimensions,
  getVisualCenterTransform,
  scanPixels,
} from '@eunsoolib/logo-soup-utils'

async function measureLogo(src: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous' // cross-origin 이미지는 CORS 허용이 있어야 getImageData 가능
  img.src = src
  await img.decode()

  const { naturalWidth: width, naturalHeight: height } = img
  const { sw, sh } = downsampleDimensions(width, height)

  const canvas = new OffscreenCanvas(sw, sh)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, sw, sh)
  const { data } = ctx.getImageData(0, 0, sw, sh)

  const measurement = scanPixels({
    width,
    height,
    data32: asUint32(data),
    sw,
    sh,
    includeDensity: true,
  })

  const size = calculateNormalizedDimensions(measurement, {
    baseSize: 48,
    densityFactor: 0.5,
  })
  const transform = getVisualCenterTransform(
    measurement,
    size.width,
    size.height,
  )

  return { ...size, transform } // <img style={{ width, height, transform }} />
}
```

## API

| 함수                                                    | 반환                  | 설명                                                                          |
| ------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `downsampleDimensions(w, h)`                            | `{ sw, sh }`          | 총 픽셀이 2048 이하가 되도록 종횡비를 유지하며 축소한 스캔 크기               |
| `asUint32(data)`                                        | `Uint32Array`         | RGBA 바이트 버퍼를 복사 없이 `0xAABBGGRR` 워드 뷰로 변환                      |
| `analyzePerimeter(data32, sw, sh)`                      | `PerimeterAnalysis`   | 테두리 픽셀 투표로 투명 배경 여부(`transparent`)와 배경색(`bgR/bgG/bgB`) 추정 |
| `scanPixels(options)`                                   | `MeasurementResult`   | 한 번의 순회로 콘텐츠 박스·시각중심·밀도·배경 휘도 계산                       |
| `calculateNormalizedDimensions(measurement, options?)`  | `{ width, height }`   | 비례 정규화 → 조사 착시 보정 → 밀도 보정을 거친 렌더 크기                     |
| `getVisualCenterTransform(measurement, w, h, alignBy?)` | `string \| undefined` | 시각중심 오프셋을 `translate(xpx, ypx)`로 변환. 0.5px 미만이면 `undefined`    |

### `ScanOptions`

| 옵션                | 타입          | 기본값  | 설명                                               |
| ------------------- | ------------- | ------- | -------------------------------------------------- |
| `width` / `height`  | `number`      | (필수)  | 원본 이미지 크기. 결과 좌표를 이 크기로 되돌림     |
| `data32`            | `Uint32Array` | (필수)  | 다운샘플한 RGBA를 `asUint32`로 변환한 값           |
| `sw` / `sh`         | `number`      | (필수)  | 다운샘플 크기                                      |
| `contrastThreshold` | `number`      | `10`    | 채널당 콘텐츠 판별 대비 임계값                     |
| `includeDensity`    | `boolean`     | `false` | `pixelDensity` 계산 여부                           |
| `backgroundColor`   | `RGB`         | —       | 배경색 강제 지정. 없으면 `analyzePerimeter`로 추정 |

### `NormalizeOptions`

| 옵션            | 기본값 | 설명                                                         |
| --------------- | ------ | ------------------------------------------------------------ |
| `baseSize`      | `48`   | 기준 크기(px)                                                |
| `scaleFactor`   | `0.5`  | 종횡비 감쇠 지수. 0이면 너비 통일, 1이면 높이 통일           |
| `densityFactor` | `0`    | 밀도 보정 강도. 0이면 보정 생략 (원본 컴포넌트 기본값은 0.5) |

`alignBy`(`AlignmentMode`)는 `'bounds'`, `'visual-center'`, `'visual-center-x'`, `'visual-center-y'`(기본값) 중 하나입니다.

## 설계 노트

### 파이프라인

```
원본 이미지
  → downsampleDimensions            : 스캔 비용을 고정 예산으로 제한
  → (호출자가 캔버스로 축소 렌더 후 RGBA 추출)
  → asUint32                        : RGBA 바이트 → Uint32 뷰
  → analyzePerimeter                : 테두리에서 배경색/투명 여부 추정
  → scanPixels                      : 단일 패스로 bbox·시각중심·밀도·배경휘도 계산
  → calculateNormalizedDimensions   : PINF → 조사보정 → 밀도보정
  → getVisualCenterTransform        : 시각중심 오프셋 → CSS transform
```

### 참고

좌표·배경·휘도 가정은 원본 `react-logo-soup`의 `src/core/{measure-pixels,normalize,get-visual-center-transform}.ts` 출하 코드 기준으로 검증되었습니다. (리틀엔디언 RGBA 패킹을 가정합니다.)
