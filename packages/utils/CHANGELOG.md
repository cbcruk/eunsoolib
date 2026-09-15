# @cbcruk/utils

## 0.1.0

### Minor Changes

- d90540e: `formatTimeFromSeconds`는 음수·소수 입력에, `getRandomNumber`는 정수가 아닌 값이나 `min > max`에 `RangeError`를 던지고, `parsePhoneNumber`는 앞자리가 `010`·`011`·`016`~`019`가 아니면 예외를 던집니다. `@cbcruk/audio-components`에서 옮겨 온 `formatCount`를 추가했으며, 반올림 결과가 다음 단위에 닿으면 단위를 올립니다(`999999` → `'1.0M'`). (#19)
