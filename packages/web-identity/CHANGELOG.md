# @cbcruk/web-identity

## 0.1.0

### Minor Changes

- 95c4bba: 기능 감지(`detectFeatures`, `isMediationSupported`, `FedCM.isActiveModeSupported` 등)가 지원을 확인할 수 없으면 `true` 대신 `false`를 반환하고, `conditionalCreate`가 `timeout`을 전달하며 `NotAllowedError` 외의 에러는 던지도록 고쳤습니다. `create({ conditional: true })`가 조건부 생성을 요청하고, `SignalAllAcceptedCredentialsOptions` 타입을 추가했습니다. (#27)
