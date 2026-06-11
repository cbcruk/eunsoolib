# @eunsoolib/logo-soup-utils

`react-logo-soup`의 로고 정규화 알고리즘을 **환경 비의존 순수 함수**로 재구성한 패키지입니다.

서로 다른 종횡비·밀도·배경을 가진 로고들을 한 줄에 나열할 때 "지각적으로 같은 크기"로 맞추기 위한 측정·정규화 수학만 다룹니다. 픽셀 데이터 획득(Canvas `getImageData`, node-canvas, sharp 등)은 **호출자 책임**이며, 여기서는 RGBA 버퍼가 주어졌을 때의 순수 계산만 수행합니다.

> 각 단계의 공식과 유도·직관은 [ALGORITHM.md](./ALGORITHM.md)에 LaTeX로 정리되어 있습니다.

## 파이프라인

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

## 참고

좌표·배경·휘도 가정은 원본 `react-logo-soup`의 `src/core/{measure-pixels,normalize,get-visual-center-transform}.ts` 출하 코드 기준으로 검증되었습니다. (리틀엔디언 RGBA 패킹을 가정합니다.)
