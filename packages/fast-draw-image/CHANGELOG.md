# @cbcruk/fast-draw-image

## 0.0.2

### Patch Changes

- d41f92c: 같은 URL을 동시에 로드할 때 각 호출의 `signal`이 그 호출만 취소하고(모두 취소되면 실제 로드 abort) `cache` 옵션도 모든 대기 호출 기준으로 반영되며, `drawImage`에 `width`나 `height` 하나만 넘기면 원본 비율로 나머지를 계산합니다. (#30)
