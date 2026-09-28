# @cbcruk/naver-map-markers

네이버 지도 v3 마커 레이어의 diff 동기화와 0·1·N 카메라 맞춤

마커를 여러 개 찍고 카메라를 자동으로 맞출 때 매번 다시 밟는 것들을 묶었다 — 좌표 없는 항목을 자르기 전에 거르기, 1개일 때 카메라가 안 움직이는 분기, 같은 건물 두 곳에서 줌이 최대로 파고드는 것, 숨겨진 탭의 크기 0 컨테이너, 목록이 바뀔 때 남는 옛 마커와 리스너.

## 설치

```bash
pnpm add @cbcruk/naver-map-markers
```

네이버 지도 스크립트(`naver.maps`)가 전역에 로드되어 있어야 한다. 타입은 `@types/navermaps` 를 함께 설치한다. React 훅(`/react`)을 쓸 때만 `react` 가 필요하다.

## 사용법

### 바닐라

```ts
import {
  applyCamera,
  createMarkerLayer,
  planCamera,
} from '@cbcruk/naver-map-markers'

const layer = createMarkerLayer(map, {
  getId: (place) => place.id,
  getPosition: (place) =>
    place.latitude == null || place.longitude == null
      ? null
      : { lat: place.latitude, lng: place.longitude },
  render: (place) => `<div class="pin">${place.name}</div>`,
  limit: 50,
})

const { points, truncated } = layer.sync(places)
applyCamera(map, planCamera(points, { minSpan: 0.004 }), {
  margin: { top: 80, right: 24, bottom: 160, left: 24 },
})

layer.destroy()
```

마커 레이어와 카메라는 일부러 분리했다. 선택 상태만 바뀌었거나 사용자가 지도를 움직인 뒤라면 `sync` 만 부르고 카메라는 건드리지 않는다.

### React

```tsx
import { applyCamera, planCamera } from '@cbcruk/naver-map-markers'
import { useMarkerLayer } from '@cbcruk/naver-map-markers/react'
import { useEffect } from 'react'

function PlaceMap({ map, places }) {
  const { points, truncated } = useMarkerLayer(map, places, {
    getId: (place) => place.id,
    getPosition: (place) => ({ lat: place.latitude, lng: place.longitude }),
    render: (place) => `<div class="pin">${place.name}</div>`,
    limit: 50,
  })

  useEffect(() => {
    if (map) return applyCamera(map, planCamera(points))
  }, [map, points])

  return truncated ? <p>일부만 표시 중</p> : null
}
```

## API

### `createMarkerLayer(map, options)`

항목 목록과 마커를 id 기준으로 맞추는 레이어를 만든다. `sync(items)` 는 사라진 id 의 마커를 떼고(리스너까지 정리), 남은 마커는 위치만 옮기고, 렌더 결과가 바뀐 경우에만 아이콘을 교체하고, 나머지를 새로 만든다.

| 옵션          | 타입                               | 기본값 | 설명                                             |
| ------------- | ---------------------------------- | ------ | ------------------------------------------------ |
| `getId`       | `(item) => string`                 | —      | diff 기준 id                                     |
| `getPosition` | `(item) => LatLngLiteral \| null`  | —      | `null` 이나 유한하지 않은 값(`NaN`)은 건너뛴다   |
| `render`      | `(item) => string`                 | —      | 마커 HTML                                        |
| `anchor`      | `naver.maps.Point \| PointLiteral` | —      | HTML 아이콘 anchor. 생략하면 SDK 기본값          |
| `limit`       | `number`                           | —      | 최대 개수. 좌표 없는 항목을 **거른 뒤에** 자른다 |
| `onClick`     | `(item) => void`                   | —      | 클릭 시 가장 최근에 `sync` 된 항목을 받는다      |

반환값: `{ sync(items): SyncResult, get(id), destroy() }`. `SyncResult` 는 `{ points, located, truncated }` 다.

### `planCamera(points, options?)`

좌표 목록으로 카메라 동작을 정한다. SDK 없이 도는 순수 함수다.

| 점 개수 | 결과                             |
| ------- | -------------------------------- |
| 0       | `{ type: 'keep' }` — 카메라 유지 |
| 1       | `{ type: 'center', at, zoom }`   |
| 2 이상  | `{ type: 'fit', sw, ne }`        |

| 옵션         | 타입     | 기본값 | 설명                                                                                      |
| ------------ | -------- | ------ | ----------------------------------------------------------------------------------------- |
| `singleZoom` | `number` | `16`   | 점이 하나일 때 줌                                                                         |
| `minSpan`    | `number` | `0`    | 박스의 최소 가로·세로(도). 같은 건물 두 곳이 화면을 꽉 채우지 않게 넓힌다. `0.004` ≈ 400m |

### `applyCamera(map, plan, options?)`

`CameraPlan` 대로 카메라를 옮긴다. 대기를 취소하는 함수를 반환한다.

| 옵션      | 타입                | 기본값 | 설명                                               |
| --------- | ------------------- | ------ | -------------------------------------------------- |
| `margin`  | `naver.maps.Margin` | —      | 픽셀 여백. 바텀시트·헤더가 덮는 영역을 보정하는 값 |
| `maxZoom` | `number`            | `17`   | 자동 줌 상한. `center` 의 줌에도 적용된다          |

### `useMarkerLayer(map, items, options)`

`@cbcruk/naver-map-markers/react`. 맵마다 레이어를 한 번 만들고 `items` 가 바뀔 때 `sync` 한 결과를 반환한다. 옵션은 인라인 객체여도 된다 — 콜백은 최신 렌더의 것을 읽으므로 의존성이 아니다. 카메라는 건드리지 않는다.

## 설계 노트

- **줌 상한은 `fitBounds` 옵션으로 넘긴다.** `fitBounds(bounds, { top, right, bottom, left, maxZoom })` 가 공식 시그니처라, `map.setOptions({ maxZoom })` 처럼 사용자의 수동 줌까지 막거나 사후에 `setZoom` 으로 되돌릴 필요가 없다.
- **크기 0 컨테이너.** `fitBounds` 는 호출 시점의 크기로 줌을 계산하고 나중에 컨테이너가 커져도 다시 계산하지 않는다. `applyCamera` 는 크기가 생길 때까지 `ResizeObserver` 로 기다렸다가 `map.refresh()` 후 적용한다.
- **라벨 잘림은 다루지 않는다.** `fitBounds` 는 지리 좌표만 보고 마커의 픽셀 크기를 모른다. 가변 폭 라벨은 `render` 의 래퍼에 `transform: translate(-50%, -100%)` 를 걸고, 남는 클리핑은 `margin` 으로 흡수한다.
- **클러스터링은 범위 밖이다.** 수백 개 이상이면 네이버의 `MarkerClustering` 모듈을 쓴다. `truncated` 로 "일부만 표시 중" 안내 여부를 정할 수 있다.
- 날짜변경선(±180°)을 걸치는 좌표는 반대편으로 감싼다.
