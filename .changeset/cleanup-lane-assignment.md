---
'@cbcruk/lane-assignment': patch
---

`assignLanesWeekly`를 `weekStartsOn: 'Monday'`로 호출하면 예외가 나던 문제와, 일요일 시작 주의 주 식별자가 일요일·연말연초에 어긋나던 문제를 고쳤습니다. `visualizeWeeklyLanes`가 `showTitle` 옵션(기본 `true`)대로 이벤트 제목을 표시합니다.
