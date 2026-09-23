---
'@cbcruk/pagination': minor
---

말줄임표 없이 페이지를 구간 단위로 보여 주는 `mode: 'block'`을 추가합니다. `blockSize`로 구간 크기를 정하고, 순수 함수 `getPaginationBlock`도 함께 내보냅니다. 첫·마지막 페이지로 가는 `goToFirst`·`goToLast`를 인스턴스에 더했고, `Pagination`에 이를 노출하는 `showEdges` prop을 추가했습니다. 기존 `window` 모드가 기본값이라 동작 변화는 없습니다.
