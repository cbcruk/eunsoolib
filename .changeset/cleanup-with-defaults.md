---
'@cbcruk/with-defaults': minor
---

`defaults`의 리터럴 타입이 유지되어 기본값을 주지 않은 필수 prop이 계속 필수로 남고, 판별 유니온 props가 멤버별 모양을 유지하며, 컴포넌트 prop이 아닌 키를 `defaults`에 넘기면 타입 에러가 납니다. 그동안 잘못 통과하던 코드가 컴파일되지 않을 수 있습니다(breaking). (#19)
