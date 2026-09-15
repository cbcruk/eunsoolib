# @cbcruk/pagination

## 0.0.2

### Patch Changes

- b337a6a: `Pagination`에 `pagination` 없이 `total` 등 옵션을 넘겨 쓸 수 있고, `total`·`pageSize`가 줄면 `page`가 `1~totalPages` 안으로 보정됩니다. `onChange`는 페이지가 실제로 바뀔 때만 호출됩니다. (#28)
