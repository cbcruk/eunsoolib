# @cbcruk/highlight-kit

## 0.1.0

### Minor Changes

- 8ba7ef7: `rangesFromOffsets`가 공백만 있는 텍스트 노드를 건너뛰지 않고 `root.textContent` 기준으로 오프셋을 계산하도록 고쳐, 요소 사이에 줄바꿈·들여쓰기가 있어도 `textContent`나 서버에서 구한 위치가 그대로 맞습니다. 이전 기준(공백 노드 제외)으로 계산한 오프셋은 다시 계산해야 합니다. (#31)
