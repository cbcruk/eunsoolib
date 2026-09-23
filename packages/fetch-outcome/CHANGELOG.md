# @cbcruk/fetch-outcome

## 0.2.0

### Minor Changes

- e848551: `safeJson`을 추가합니다. 본문을 JSON으로 읽되, 스트림이 끊긴 전송 실패와 "바이트는 왔지만 JSON이 아닌" 경우를 구분합니다. 후자는 서버가 요청을 처리했다는 뜻이므로 네트워크 실패로 취급하지 않고, 이미 처리된 비멱등 요청의 재시도를 `unsafe`로 판단합니다.

## 0.1.0

### Minor Changes

- 087dc2a: 실패한 fetch를 재시도 판단이 담긴 `FetchOutcome`으로 바꾸는 `@cbcruk/fetch-outcome`을 추가합니다. 예전 `cbcruk/fetch-error-code` 저장소에서 옮겨 오면서 던지는 방식의 `codedFetch`/`codedBody`를 제거하고, 적합성 기준선을 Node 24 / undici 8.11에서 다시 측정했습니다.
