---
'@cbcruk/in-view': patch
---

인라인 `onIntersect`를 넘겨도 옵저버가 매 렌더 다시 만들어지지 않고, `InView`에 `ref`를 넘겨도 관찰이 유지됩니다. `root`·`rootMargin` 옵션과 훅의 제네릭 엘리먼트 타입도 추가했습니다. (#7)
