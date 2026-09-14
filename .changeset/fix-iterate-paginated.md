---
'@cbcruk/iterate-paginated': patch
---

`nextState`가 `null`이면 순회를 끝내고, 직전 커서와 같은 커서가 반환되면 무한 루프 대신 `RepeatedCursorError`를 던집니다. 순회를 중단할 수 있는 `signal` 옵션도 추가했습니다. (#9)
