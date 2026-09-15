# @cbcruk/intl-layer

## 0.1.0

### Minor Changes

- 8ba7ef7: `applyI18n`·`bindI18nSweep`·`<fmt-date>`가 날짜·숫자로 해석되지 않는 값을 만나도 예외로 멈추지 않고 원문을 유지한 채 나머지 요소를 갱신합니다. `supported` 없이 호출한 `resolveLocale`은 `products` 같은 locale이 아닌 후보를 건너뛰고 정규화된 태그를 반환합니다. (#34)
