---
'@cbcruk/dayjs-utils': minor
---

`TimeRange`가 오늘이 아니라 넘긴 시각의 날짜로 판정하고 `22:00:00` ~ `02:00:00`처럼 자정을 넘는 구간을 지원합니다. `DateNavigator`는 필요한 플러그인을 직접 등록해 커스텀 포맷을 항상 적용하며, 이제 strict 파싱으로 잘못된 날짜에 `Error`를 던집니다(breaking). (#12)
