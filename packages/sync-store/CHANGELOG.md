# @cbcruk/sync-store

## 0.0.2

### Patch Changes

- d90540e: `persist`가 호출하지 않는 `PersistStorage.removeItem`을 선택 멤버로 바꿔, `getItem`·`setItem`만 구현한 저장소도 넘길 수 있습니다. (#36)
