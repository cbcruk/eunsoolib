---
'@cbcruk/cors-image-proxy': patch
---

preflight가 허용한 `HEAD` 요청을 405 대신 본문 없는 응답으로 처리하고, 허용된 origin의 에러 응답(400·403·405·upstream 오류·502)에도 CORS 헤더를 붙여 브라우저에서 실제 상태 코드를 확인할 수 있습니다. (#29)
