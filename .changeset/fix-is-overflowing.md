---
'@cbcruk/is-overflowing': minor
---

오버플로우 여부를 렌더 중이 아니라 커밋 직후와 `ResizeObserver`·`MutationObserver` 콜백에서 측정해, 첫 표시부터 올바른 값을 주고 내용만 바뀌어도 갱신됩니다. `OverflowDetection<T>`의 기본 타입이 훅과 같은 `HTMLDivElement`로 바뀌었습니다. (#8)
