# @eunsoolib/utils

난수 생성, 휴대폰 번호 파싱, 초 단위 시간 포맷 같은 작은 유틸 모음입니다.

## 설치

```bash
pnpm add @eunsoolib/utils
```

## 사용법

### `getRandomNumber`

```ts
import { getRandomNumber } from '@eunsoolib/utils'

getRandomNumber({ min: 1, max: 6 }) // 1 ~ 6 중 하나
```

### `parsePhoneNumber`

```ts
import { parsePhoneNumber } from '@eunsoolib/utils'

const { prefix, middle, suffix } = parsePhoneNumber('01012345678')
// prefix: '010', middle: '1234', suffix: '5678'

parsePhoneNumber('010-1234-5678') // throws
```

### `formatTimeFromSeconds`

```ts
import { formatTimeFromSeconds } from '@eunsoolib/utils'

formatTimeFromSeconds(3701) // '1시간 1분 41초'
formatTimeFromSeconds(3601) // '1시간 1초'
formatTimeFromSeconds(0) // ''
```

## API

### `getRandomNumber({ min, max })`

`min` 이상 `max` 이하의 정수를 반환합니다(양 끝 포함). `Math.random` 기반이라 보안 용도로는
적합하지 않으며, 인자 검증은 하지 않습니다.

| 옵션  | 타입     | 설명         |
| ----- | -------- | ------------ |
| `min` | `number` | 최솟값(포함) |
| `max` | `number` | 최댓값(포함) |

### `parsePhoneNumber(value)`

하이픈 없는 **숫자 11자리** 문자열을 `3-4-4`로 나눠 `{ prefix, middle, suffix }`를 반환합니다.
형식이 맞지 않으면 `Error('유효하지 않은 전화번호 형식입니다')`를 던집니다.

- 하이픈·공백이 섞인 값, 10자리 번호는 모두 예외입니다.
- 앞자리가 `010` 등인지는 검사하지 않습니다(11자리 숫자면 통과).

### `formatTimeFromSeconds(seconds)`

초를 `N시간 N분 N초` 형태의 한국어 문자열로 반환합니다. 0인 단위는 생략하고, 모두 0이면 빈
문자열을 반환합니다. 소수점 초는 그대로 남습니다(`1.5` → `'1.5초'`).
