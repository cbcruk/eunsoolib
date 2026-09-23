---
'@cbcruk/fetch-outcome': minor
---

실패한 fetch를 재시도 판단이 담긴 `FetchOutcome`으로 바꾸는 `@cbcruk/fetch-outcome`을 추가합니다. 예전 `cbcruk/fetch-error-code` 저장소에서 옮겨 오면서 던지는 방식의 `codedFetch`/`codedBody`를 제거하고, 적합성 기준선을 Node 24 / undici 8.11에서 다시 측정했습니다.
