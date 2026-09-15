# @cbcruk/download-image

## 0.1.0

### Minor Changes

- 95c4bba: **Breaking:** `downloadImage`가 콘솔 로그 대신 저장한 파일 경로로 resolve하고, 요청 실패·2xx가 아닌 HTTP 상태·저장 실패 시 `DownloadImageError`로 reject합니다. 조합 가능한 `downloadImageEffect`와 `filename` 옵션을 추가했습니다. (#13)

### Patch Changes

- Updated dependencies [d90540e]
  - @cbcruk/get-file-type-from-buffer@0.0.2
